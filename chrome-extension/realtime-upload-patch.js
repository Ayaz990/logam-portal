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

    // Trigger real-time transcription for this chunk (don't wait)
    if (!this.chunkIndex) this.chunkIndex = 0
    this.chunkIndex++

    this.triggerChunkTranscription(blob, this.chunkIndex).catch(err => {
      console.error('⚠️ Chunk transcription failed:', err)
      // Don't fail upload if transcription fails
    })

    this.isUploading = false
  } catch (error) {
    console.error('❌ Chunk upload failed:', error)
    this.isUploading = false
    // Continue recording even if upload fails
  }
}

// Trigger real-time transcription for uploaded chunk
ProfessionalRecorder.prototype.triggerChunkTranscription = async function(chunkBlob, chunkIndex) {
  try {
    if (!this.meetingId || !this.enableRealtimeTranscription) {
      return // Skip if meeting not created yet or disabled
    }

    console.log(`🎤 Triggering transcription for chunk ${chunkIndex}...`)

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
        isLastChunk: false
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`✅ Chunk ${chunkIndex} transcribed:`, result.transcriptLength, 'chars')

      // Update status to show progress
      if (result.transcriptLength > 0) {
        this.updateStatus(`Recording... (${result.transcriptLength} chars transcribed)`, 'recording')
      }
    } else {
      console.error('❌ Transcription failed:', await response.text())
    }

  } catch (error) {
    console.error('❌ Chunk transcription error:', error)
    // Don't throw - let recording continue
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

      // Upload any remaining chunks
      if (this.chunks.length > 0 && !this.isUploading) {
        const blob = new Blob(this.chunks, { type: 'video/webm' })
        console.log(`📤 Uploading final chunks: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)

        await this.firebaseUploader.uploadChunk(blob, true, (totalProgress) => {
          this.progressBar.style.width = totalProgress + '%'
          this.progressPercent.textContent = totalProgress + '%'
        })
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
      this.updateStatus('Recording saved! (uploaded in real-time)', 'success')

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
