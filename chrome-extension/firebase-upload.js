// Direct Firebase Storage Upload with Real-time Chunked Upload
// This uploads chunks WHILE recording - no waiting after recording stops!
// Bypasses Vercel's body size limits completely

class FirebaseUploader {
  constructor(config) {
    this.config = config
    this.apiKey = config.apiKey
    this.storageBucket = config.storageBucket
    this.uploadSessionUrl = null
    this.uploadedBytes = 0
    this.totalBytes = 0
    this.fileName = null
  }

  /**
   * Start a resumable upload session for real-time chunked uploads
   * @param {string} fileName - The destination file name
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} - Upload session URL
   */
  async startResumableUpload(fileName, contentType = 'video/webm') {
    try {
      console.log('🚀 Starting resumable upload session...')
      console.log('📁 File:', fileName)

      this.fileName = fileName

      // Initialize resumable upload
      const initUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o?uploadType=resumable&name=${encodeURIComponent(fileName)}`

      const response = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Content-Type': contentType,
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to start upload session: ${response.status}`)
      }

      // Get upload session URL from response header
      this.uploadSessionUrl = response.headers.get('X-Goog-Upload-URL')

      if (!this.uploadSessionUrl) {
        // Fallback: construct session URL from Location header
        this.uploadSessionUrl = response.headers.get('Location')
      }

      console.log('✅ Upload session started')
      console.log('🔗 Session URL:', this.uploadSessionUrl)

      return this.uploadSessionUrl
    } catch (error) {
      console.error('❌ Failed to start upload session:', error)
      throw error
    }
  }

  /**
   * Upload a chunk to the resumable upload session
   * @param {Blob} chunk - Data chunk to upload
   * @param {boolean} isFinal - Whether this is the final chunk
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<boolean>} - True if upload complete
   */
  async uploadChunk(chunk, isFinal = false, onProgress = null) {
    try {
      if (!this.uploadSessionUrl) {
        throw new Error('No upload session started')
      }

      const chunkSize = chunk.size
      const currentOffset = this.uploadedBytes

      console.log(`📤 Uploading chunk: ${(chunkSize / 1024).toFixed(2)} KB at offset ${(currentOffset / 1024 / 1024).toFixed(2)} MB`)

      // Upload using PUT with correct range headers
      const xhr = new XMLHttpRequest()

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const chunkProgress = Math.round((e.loaded / e.total) * 100)
            const totalBytes = currentOffset + chunkSize
            const totalProgress = Math.round((currentOffset + e.loaded) / totalBytes * 100)
            onProgress(totalProgress, chunkProgress)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200 || xhr.status === 201) {
            console.log('✅ Final chunk uploaded successfully')
            this.uploadedBytes += chunkSize
            this.totalBytes = this.uploadedBytes

            if (isFinal) {
              console.log('🎉 Upload complete!')
              resolve(true)
            } else {
              resolve(false)
            }
          } else if (xhr.status === 308) {
            // Resume incomplete - this is normal for chunked uploads
            console.log('⏸️ Chunk uploaded, continuing...')
            this.uploadedBytes += chunkSize
            this.totalBytes = this.uploadedBytes
            resolve(false)
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during chunk upload'))
        })

        xhr.open('PUT', this.uploadSessionUrl)

        // Set correct offset for resumable upload
        if (isFinal) {
          xhr.setRequestHeader('X-Goog-Upload-Command', 'upload, finalize')
          xhr.setRequestHeader('X-Goog-Upload-Offset', currentOffset.toString())
        } else {
          xhr.setRequestHeader('X-Goog-Upload-Command', 'upload')
          xhr.setRequestHeader('X-Goog-Upload-Offset', currentOffset.toString())
        }

        xhr.setRequestHeader('Content-Type', 'video/webm')
        xhr.send(chunk) // Send only the current chunk, not all previous chunks
      })
    } catch (error) {
      console.error('❌ Chunk upload error:', error)
      throw error
    }
  }

  /**
   * Finalize upload and get download URL
   * @returns {Promise<string>} - Download URL
   */
  async finalizeUpload() {
    try {
      console.log('🏁 Finalizing upload...')

      // Get download URL
      const downloadUrl = await this.getDownloadURL(this.fileName)
      console.log('✅ Upload finalized!')
      console.log('🔗 Download URL:', downloadUrl)

      // Reset state
      this.uploadSessionUrl = null
      this.uploadedBytes = 0
      this.totalBytes = 0

      return downloadUrl
    } catch (error) {
      console.error('❌ Finalize error:', error)
      throw error
    }
  }

  /**
   * Legacy: Upload entire file at once (for small files)
   * @param {Blob} blob - The file blob to upload
   * @param {string} fileName - The destination file name
   * @param {Function} onProgress - Progress callback (percent)
   * @returns {Promise<string>} - Download URL
   */
  async uploadFile(blob, fileName, onProgress = null) {
    try {
      console.log('📤 Starting single-file upload...')
      console.log('📦 File size:', (blob.size / 1024 / 1024).toFixed(2), 'MB')

      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o?uploadType=media&name=${encodeURIComponent(fileName)}`

      const xhr = new XMLHttpRequest()

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percent = Math.round((e.loaded / e.total) * 100)
            onProgress(percent)
          }
        })

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            const downloadUrl = await this.getDownloadURL(fileName)
            resolve(downloadUrl)
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error')))

        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Content-Type', blob.type || 'video/webm')
        xhr.send(blob)
      })
    } catch (error) {
      console.error('❌ Upload error:', error)
      throw error
    }
  }

  /**
   * Get download URL for uploaded file
   * @param {string} filePath - The file path in storage
   * @returns {Promise<string>} - Public download URL
   */
  async getDownloadURL(filePath) {
    try {
      const metadataUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o/${encodeURIComponent(filePath)}`

      const response = await fetch(metadataUrl)
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.status}`)
      }

      const metadata = await response.json()
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o/${encodeURIComponent(filePath)}?alt=media&token=${metadata.downloadTokens}`

      return downloadUrl
    } catch (error) {
      console.error('❌ Error getting download URL:', error)
      throw error
    }
  }
}

// Export for use in extension
window.FirebaseUploader = FirebaseUploader
