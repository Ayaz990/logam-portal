// Real-time Upload Patch for recorder-ui.js
// This extends the ProfessionalRecorder with real-time chunked upload capability

// Override the start method to enable real-time upload
const originalStart = ProfessionalRecorder.prototype.start
ProfessionalRecorder.prototype.start = async function() {
  // Initialize real-time upload properties
  this.firebaseUploader = null
  this.uploadInterval = null
  this.pendingChunks = []
  this.isUploading = false
  this.fileName = `recordings/${Date.now()}.webm`
  this.chunkUploadEnabled = true
  this.chunkIndex = 0
  this.transcriptionQueue = []
  this.isTranscribing = false

  // Call original start
  await originalStart.call(this)

  // Start real-time upload if recording started successfully
  if (this.recording) {
    await this.startRealtimeUpload()
  }
}

// Add real-time upload initialization
ProfessionalRecorder.prototype.startRealtimeUpload = async function() {
  try {
    console.log('🚀 Starting real-time upload...')

    // Initialize Firebase uploader
    this.firebaseUploader = new FirebaseUploader(window.firebaseConfig)

    // Start resumable upload session
    await this.firebaseUploader.startResumableUpload(this.fileName, 'video/webm')

    console.log('✅ Real-time upload session started')

    // Create meeting entry immediately to get meetingId for real-time transcription
    this.enableRealtimeTranscription = true
    await this.createMeetingEntry()

    this.updateStatus('Recording... (uploading & transcribing in real-time)', 'recording')

    // Show progress bar during recording
    this.progressContainer.style.display = 'block'
    this.progressBar.style.width = '0%'
    this.progressPercent.textContent = '0%'
    this.progressText.textContent = 'Uploading & transcribing...'

    // Upload chunks every 10 seconds
    this.uploadInterval = setInterval(() => {
      this.uploadPendingChunks()
    }, 10000) // 10 seconds

    console.log('⏱️ Chunk upload interval started (10 seconds)')
    console.log('🎤 Real-time transcription enabled')
  } catch (error) {
    console.error('❌ Failed to start real-time upload:', error)
    this.chunkUploadEnabled = false
    this.enableRealtimeTranscription = false
    this.updateStatus('Recording... (will upload after stop)', 'recording')
  }
}

// Create meeting entry early for real-time transcription
ProfessionalRecorder.prototype.createMeetingEntry = async function() {
  try {
    const meetingName = this.nameInput.value.trim() || 'Untitled Meeting'
    const timestamp = this.startTime || Date.now()

    console.log('💾 Creating meeting entry for real-time transcription...')

    const response = await fetch(`${this.apiUrl}/api/save-meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.userId,
        meetUrl: window.location.href,
        timestamp: timestamp,
        videoUrl: '', // Will be updated when finalized
        downloadURL: '',
        fileName: this.fileName,
        fileSize: 0, // Will be updated
        mimeType: 'video/webm',
        meetingName: meetingName,
        duration: 0, // Will be updated
        isRealtime: true,
        status: 'recording'
      })
    })

    if (response.ok) {
      const result = await response.json()
      this.meetingId = result.id
      console.log('✅ Meeting entry created:', this.meetingId)
    } else {
      throw new Error('Failed to create meeting entry')
    }
  } catch (error) {
    console.error('❌ Failed to create meeting entry:', error)
    this.enableRealtimeTranscription = false
  }
}

// Upload accumulated chunks
ProfessionalRecorder.prototype.uploadPendingChunks = async function() {
  if (this.isUploading || this.chunks.length === 0 || !this.chunkUploadEnabled) {
    return
  }

  try {
    this.isUploading = true

    // Get all accumulated chunks
    const chunksToUpload = [...this.chunks]
    const blob = new Blob(chunksToUpload, { type: 'video/webm' })

    console.log(`📤 Uploading ${chunksToUpload.length} chunks (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)

    // Upload chunk with progress
    await this.firebaseUploader.uploadChunk(blob, false, (totalProgress) => {
      this.progressBar.style.width = totalProgress + '%'
      this.progressPercent.textContent = totalProgress + '%'
      this.progressText.textContent = 'Uploading & transcribing...'
    })

    console.log('✅ Chunks uploaded successfully')

    // Clear uploaded chunks to free memory
    this.chunks = []

    // Queue transcription for this chunk
    this.chunkIndex++
    this.queueChunkTranscription(blob, this.chunkIndex, false)

    this.isUploading = false
  } catch (error) {
    console.error('❌ Chunk upload failed:', error)
    this.isUploading = false
    // Continue recording even if upload fails
  }
}

// Queue a chunk for transcription
ProfessionalRecorder.prototype.queueChunkTranscription = function(chunkBlob, chunkIndex, isLastChunk) {
  this.transcriptionQueue.push({ chunkBlob, chunkIndex, isLastChunk })
  this.processTranscriptionQueue()
}

// Process transcription queue sequentially
ProfessionalRecorder.prototype.processTranscriptionQueue = async function() {
  if (this.isTranscribing || this.transcriptionQueue.length === 0) {
    return
  }

  this.isTranscribing = true

  while (this.transcriptionQueue.length > 0) {
    const { chunkBlob, chunkIndex, isLastChunk } = this.transcriptionQueue.shift()
    await this.triggerChunkTranscription(chunkBlob, chunkIndex, isLastChunk)
  }

  this.isTranscribing = false
}

// Trigger real-time transcription for uploaded chunk with retry
ProfessionalRecorder.prototype.triggerChunkTranscription = async function(chunkBlob, chunkIndex, isLastChunk, retryCount = 0) {
  const maxRetries = 3

  try {
    if (!this.meetingId || !this.enableRealtimeTranscription) {
      return // Skip if meeting not created yet or disabled
    }

    console.log(`🎤 Triggering transcription for chunk ${chunkIndex}... ${isLastChunk ? '(LAST CHUNK)' : ''}`)

    // Upload chunk to temporary location for transcription
    const chunkFileName = `temp-chunks/${this.fileName.replace('recordings/', '')}-chunk-${chunkIndex}.webm`
    const chunkUploader = new FirebaseUploader(window.firebaseConfig)

    const chunkUrl = await chunkUploader.uploadFile(chunkBlob, chunkFileName)
    console.log('✅ Chunk uploaded for transcription:', chunkUrl)

    // Trigger transcription
    const response = await fetch(`${this.apiUrl}/api/transcribe-chunk-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: this.meetingId,
        chunkUrl: chunkUrl,
        chunkIndex: chunkIndex,
        isLastChunk: isLastChunk
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Chunk ${chunkIndex} transcribed:`, result.transcriptLength, 'chars')

      // Update status to show progress
      if (result.transcriptLength > 0) {
        const statusMessage = isLastChunk
          ? `Finalizing... (${result.transcriptLength} chars, generating summary...)`
          : `Recording... (${result.transcriptLength} chars transcribed)`
        this.updateStatus(statusMessage, 'recording')
      }
    } else {
      const errorText = await response.text()
      throw new Error(`Transcription API failed: ${response.status} - ${errorText}`)
    }

  } catch (error) {
    console.error(`❌ Chunk ${chunkIndex} transcription error (attempt ${retryCount + 1}/${maxRetries}):`, error)

    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying chunk ${chunkIndex} in 3 seconds...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      return this.triggerChunkTranscription(chunkBlob, chunkIndex, isLastChunk, retryCount + 1)
    } else {
      console.error(`❌ Chunk ${chunkIndex} transcription failed after ${maxRetries} attempts`)
      // Don't throw - let recording continue
    }
  }
}

// Override stop to finalize upload
const originalStop = ProfessionalRecorder.prototype.stop
ProfessionalRecorder.prototype.stop = function() {
  // Stop chunk upload interval
  if (this.uploadInterval) {
    clearInterval(this.uploadInterval)
    this.uploadInterval = null
  }

  // Call original stop
  originalStop.call(this)
}

// Override uploadToFirebase to handle real-time upload
const originalUploadToFirebase = ProfessionalRecorder.prototype.uploadToFirebase
ProfessionalRecorder.prototype.uploadToFirebase = async function() {
  try {
    // Check if we're using real-time upload
    if (this.chunkUploadEnabled && this.firebaseUploader && this.firebaseUploader.uploadSessionUrl) {
      console.log('🏁 Finalizing real-time upload...')

      this.updateRecordButton('uploading')
      this.updateStatus('Finalizing upload...', 'info')

      // Upload any remaining chunks and mark as final
      if (this.chunks.length > 0 && !this.isUploading) {
        const blob = new Blob(this.chunks, { type: 'video/webm' })
        console.log(`📤 Uploading final chunks: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

        await this.firebaseUploader.uploadChunk(blob, true, (totalProgress) => {
          this.progressBar.style.width = totalProgress + '%'
          this.progressPercent.textContent = totalProgress + '%'
        })

        // Clear uploaded chunks
        this.chunks = []

        // Queue last chunk for transcription with isLastChunk flag
        this.chunkIndex++
        this.queueChunkTranscription(blob, this.chunkIndex, true)
        console.log('🎯 Queued last chunk for transcription and summary generation')
      } else if (this.chunkIndex > 0) {
        // If no remaining chunks but we have uploaded chunks, mark the last uploaded one
        console.log('🎯 Marking previous chunk as last chunk for summary generation')
        // Trigger a final API call to mark completion
        if (this.meetingId && this.enableRealtimeTranscription) {
          try {
            const response = await fetch(`${this.apiUrl}/api/transcribe-chunk-stream`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                meetingId: this.meetingId,
                chunkUrl: '', // Empty URL to signal just marking as complete
                chunkIndex: this.chunkIndex,
                isLastChunk: true,
                markCompleteOnly: true
              })
            })
            if (response.ok) {
              console.log('✅ Meeting marked as complete, summary generation triggered')
            }
          } catch (err) {
            console.error('⚠️ Failed to mark meeting as complete:', err)
          }
        }
      }

      // Get download URL
      const downloadURL = await this.firebaseUploader.finalizeUpload()
      console.log('✅ Real-time upload complete!')
      console.log('🔗 Download URL:', downloadURL)

      // Save metadata
      await this.saveMetadata(downloadURL)

      // Success
      this.cleanupStreams()
      this.uploadRetries = 0
      this.recordBtn.disabled = false

      this.updateRecordButton('success')
      this.updateStatus('Recording saved! Transcript will be ready in ~10 seconds', 'success')

      setTimeout(() => {
        this.progressContainer.style.display = 'none'
      }, 1500)

      setTimeout(() => {
        this.updateRecordButton('ready')
        this.updateStatus('Ready to record', 'info')
        this.timerDiv.textContent = '00:00'
        this.sizeDiv.style.display = 'none'
      }, 3000)

      return
    }

    // Fall back to original upload method
    await originalUploadToFirebase.call(this)
  } catch (error) {
    console.error('❌ Upload failed:', error)

    // Fallback: try original upload method
    console.log('⚠️ Trying fallback upload method...')
    this.chunkUploadEnabled = false
    this.firebaseUploader = null

    try {
      await originalUploadToFirebase.call(this)
    } catch (fallbackError) {
      console.error('❌ Fallback upload also failed:', fallbackError)
      this.cleanupStreams()
      this.recordBtn.disabled = false
      this.progressContainer.style.display = 'none'
      this.updateRecordButton('error')
      this.updateStatus(`Upload failed: ${error.message}`, 'error')
      this.offerLocalDownload()

      setTimeout(() => {
        this.updateRecordButton('ready')
        this.updateStatus('Ready to record', 'info')
        this.timerDiv.textContent = '00:00'
        this.sizeDiv.style.display = 'none'
      }, 5000)
    }
  }
}

// Helper method to save metadata
ProfessionalRecorder.prototype.saveMetadata = async function(downloadURL) {
  const meetingName = this.nameInput.value.trim() || 'Untitled Meeting'
  const timestamp = this.startTime || Date.now()

  console.log('💾 Saving meeting metadata...')

  const metadataResponse = await fetch(`${this.apiUrl}/api/save-meeting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: this.userId,
      meetUrl: window.location.href,
      timestamp: timestamp,
      videoUrl: downloadURL,
      downloadURL: downloadURL,
      fileName: this.fileName,
      fileSize: this.recordingDataSize,
      mimeType: 'video/webm',
      meetingName: meetingName,
      duration: Date.now() - this.startTime
    })
  })

  if (!metadataResponse.ok) {
    throw new Error(`Failed to save metadata: ${metadataResponse.status}`)
  }

  const result = await metadataResponse.json()
  console.log('✅ Metadata saved:', result)
  return result
}

console.log('✅ Real-time upload patch loaded!')
