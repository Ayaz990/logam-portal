/**
 * Local Whisper Transcription Client
 * Uses local Whisper API for privacy-focused transcription
 */

export class WhisperLocal {
  constructor() {
    this.isTranscribing = false
    this.onTranscriptUpdate = null
    this.onError = null
    this.apiUrl = '/api/transcribe-local'
  }

  /**
   * Transcribe an audio file
   * @param {File|Blob} audioFile - Audio file to transcribe
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeFile(audioFile, options = {}) {
    if (this.isTranscribing) {
      throw new Error('Already transcribing. Please wait for current transcription to complete.')
    }

    this.isTranscribing = true

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('options', JSON.stringify(options))

      console.log('🎤 Sending audio to local Whisper API...')

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Transcription failed')
      }

      console.log('✅ Local transcription complete')
      return result

    } catch (error) {
      console.error('❌ Local transcription error:', error)
      if (this.onError) {
        this.onError(error)
      }
      throw error
    } finally {
      this.isTranscribing = false
    }
  }

  /**
   * Transcribe audio stream in chunks (for real-time transcription)
   * @param {MediaRecorder} mediaRecorder - Active media recorder
   * @param {Object} options - Transcription options
   */
  async transcribeStream(mediaRecorder, options = {}) {
    const chunks = []
    let chunkCount = 0
    const chunkInterval = options.chunkInterval || 5000 // 5 seconds

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
        chunkCount++

        // Process every few chunks for real-time transcription
        if (chunkCount % Math.ceil(chunkInterval / 1000) === 0) {
          try {
            const audioBlob = new Blob(chunks.slice(-3), { type: 'audio/webm' })
            const result = await this.transcribeFile(audioBlob, options)

            if (this.onTranscriptUpdate && result.transcript) {
              this.onTranscriptUpdate(result.transcript, {
                isPartial: true,
                timestamp: Date.now(),
                chunkIndex: chunkCount
              })
            }
          } catch (error) {
            console.warn('Chunk transcription failed:', error)
          }
        }
      }
    }

    mediaRecorder.onstop = async () => {
      try {
        // Final transcription with all chunks
        const finalBlob = new Blob(chunks, { type: 'audio/webm' })
        const result = await this.transcribeFile(finalBlob, options)

        if (this.onTranscriptUpdate && result.transcript) {
          this.onTranscriptUpdate(result.transcript, {
            isPartial: false,
            isFinal: true,
            timestamp: Date.now(),
            duration: result.duration
          })
        }
      } catch (error) {
        console.error('Final transcription failed:', error)
      }
    }
  }

  /**
   * Set callback for transcript updates
   * @param {Function} callback - Function to call with transcript updates
   */
  onTranscript(callback) {
    this.onTranscriptUpdate = callback
  }

  /**
   * Set callback for errors
   * @param {Function} callback - Function to call with errors
   */
  onErrorCallback(callback) {
    this.onError = callback
  }

  /**
   * Check if local Whisper API is available
   * @returns {Promise<Boolean>} API availability
   */
  async checkAvailability() {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'OPTIONS'
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get supported audio formats
   * @returns {Array<String>} Supported MIME types
   */
  getSupportedFormats() {
    return [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/m4a',
      'audio/ogg'
    ]
  }
}

// Export singleton instance
export const whisperLocal = new WhisperLocal()

// Export utility functions
export const transcribeAudioFile = async (file, options = {}) => {
  return await whisperLocal.transcribeFile(file, options)
}

export const startRealtimeTranscription = async (mediaRecorder, options = {}) => {
  return await whisperLocal.transcribeStream(mediaRecorder, options)
}