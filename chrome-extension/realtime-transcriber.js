// Real-time transcription for Google Meet
console.log('🎤 Real-time Transcriber Loading...')

class RealtimeTranscriber {
  constructor() {
    this.isTranscribing = false
    this.websocket = null
    this.audioContext = null
    this.mediaStream = null
    this.processor = null
    this.transcriptContainer = null
    this.currentTranscript = ''
    this.finalTranscripts = []
    this.meetingObserver = null
    this.autoStarted = false

    // Enhanced features
    this.speakers = new Map() // Track different speakers
    this.currentSpeaker = null
    this.language = 'en-US' // Default language
    this.translateTo = null // Translation target language
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectTimeout = null
    this.isReconnecting = false
    this.audioBuffer = [] // Buffer audio during reconnection
    this.lastActivityTime = Date.now()

    // Quality metrics
    this.transcriptionQuality = {
      averageConfidence: 0,
      totalTranscripts: 0,
      lowConfidenceCount: 0
    }

    this.createTranscriptUI()
    this.detectMeetingAndStart()
    this.setupActivityMonitoring()
  }

  createTranscriptUI() {
    // Create transcript overlay with enhanced controls
    this.transcriptContainer = document.createElement('div')
    this.transcriptContainer.id = 'realtime-transcript'
    this.transcriptContainer.style.cssText = `
      position: fixed !important;
      bottom: 20px !important;
      left: 20px !important;
      right: 20px !important;
      max-width: 900px !important;
      margin: 0 auto !important;
      z-index: 99998 !important;
      background: rgba(0, 0, 0, 0.9) !important;
      color: white !important;
      padding: 16px 20px !important;
      border-radius: 12px !important;
      backdrop-filter: blur(15px) !important;
      -webkit-backdrop-filter: blur(15px) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
      max-height: 300px !important;
      overflow-y: auto !important;
      display: none !important;
      transition: all 0.3s ease !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    `

    // Enhanced Header with controls
    const header = document.createElement('div')
    header.style.cssText = `
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 12px !important;
      padding-bottom: 8px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
    `

    const titleContainer = document.createElement('div')
    titleContainer.style.cssText = `
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    `

    const title = document.createElement('div')
    title.style.cssText = `
      font-size: 14px !important;
      font-weight: 600 !important;
      color: #fff !important;
    `
    title.textContent = '🎤 Live Transcript'

    // Quality indicator
    this.qualityIndicator = document.createElement('div')
    this.qualityIndicator.style.cssText = `
      font-size: 11px !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      background: rgba(74, 222, 128, 0.2) !important;
      color: #4ade80 !important;
    `
    this.qualityIndicator.textContent = 'High Quality'

    titleContainer.appendChild(title)
    titleContainer.appendChild(this.qualityIndicator)

    // Control buttons
    const controls = document.createElement('div')
    controls.style.cssText = `
      display: flex !important;
      gap: 8px !important;
      align-items: center !important;
    `

    // Language selector
    this.languageSelector = document.createElement('select')
    this.languageSelector.style.cssText = `
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      color: white !important;
      font-size: 11px !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
    `
    const languages = [
      { code: 'en-US', name: 'English' },
      { code: 'es-ES', name: 'Español' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'it-IT', name: 'Italiano' },
      { code: 'pt-BR', name: 'Português' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' },
      { code: 'zh-CN', name: '中文' },
      { code: 'hi-IN', name: 'हिन्दी' },
      { code: 'ar-SA', name: 'العربية' }
    ]

    languages.forEach(lang => {
      const option = document.createElement('option')
      option.value = lang.code
      option.textContent = lang.name
      option.selected = lang.code === this.language
      this.languageSelector.appendChild(option)
    })

    this.languageSelector.onchange = () => {
      this.changeLanguage(this.languageSelector.value)
    }

    // Export button
    const exportBtn = document.createElement('button')
    exportBtn.style.cssText = `
      background: rgba(59, 130, 246, 0.8) !important;
      border: none !important;
      color: #fff !important;
      font-size: 11px !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background-color 0.2s !important;
    `
    exportBtn.innerHTML = '📥 Export'
    exportBtn.onclick = () => this.exportTranscript()

    // Settings button
    const settingsBtn = document.createElement('button')
    settingsBtn.style.cssText = `
      background: rgba(107, 114, 128, 0.8) !important;
      border: none !important;
      color: #fff !important;
      font-size: 11px !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background-color 0.2s !important;
    `
    settingsBtn.innerHTML = '⚙️'
    settingsBtn.onclick = () => this.showSettings()

    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.style.cssText = `
      background: rgba(239, 68, 68, 0.8) !important;
      border: none !important;
      color: #fff !important;
      font-size: 16px !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background-color 0.2s !important;
    `
    closeBtn.innerHTML = '×'
    closeBtn.onclick = () => this.stopTranscription()

    controls.appendChild(this.languageSelector)
    controls.appendChild(exportBtn)
    controls.appendChild(settingsBtn)
    controls.appendChild(closeBtn)

    header.appendChild(titleContainer)
    header.appendChild(controls)

    // Stats bar
    this.statsBar = document.createElement('div')
    this.statsBar.style.cssText = `
      font-size: 10px !important;
      color: rgba(255, 255, 255, 0.7) !important;
      margin-bottom: 8px !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    `

    // Enhanced transcript content with speaker labels
    this.transcriptContent = document.createElement('div')
    this.transcriptContent.style.cssText = `
      font-size: 14px !important;
      line-height: 1.6 !important;
      max-height: 180px !important;
      overflow-y: auto !important;
      padding-right: 8px !important;
    `

    // Add scrollbar styling
    const scrollbarStyle = document.createElement('style')
    scrollbarStyle.textContent = `
      #realtime-transcript div::-webkit-scrollbar {
        width: 6px;
      }
      #realtime-transcript div::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      #realtime-transcript div::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }
      #realtime-transcript div::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `
    document.head.appendChild(scrollbarStyle)

    this.transcriptContainer.appendChild(header)
    this.transcriptContainer.appendChild(this.statsBar)
    this.transcriptContainer.appendChild(this.transcriptContent)
    document.body.appendChild(this.transcriptContainer)
  }

  detectMeetingAndStart() {
    // Wait for page to load
    setTimeout(() => {
      console.log('🔍 Checking for active meeting...')

      // Check if we're in a meeting
      const videoElements = document.querySelectorAll('video')
      const meetingTitle = document.querySelector('[data-meeting-title]') ||
                          document.querySelector('[jsname="r4nke"]') ||
                          document.querySelector('h1[class*="title"]')

      if (videoElements.length > 0 || meetingTitle) {
        console.log('✅ Meeting detected, starting automatic transcription...')
        this.startAutomaticTranscription()
      } else {
        // Keep watching for meeting to start
        this.watchForMeetingStart()
      }
    }, 3000)
  }

  watchForMeetingStart() {
    this.meetingObserver = new MutationObserver((mutations) => {
      const videoElements = document.querySelectorAll('video')
      if (videoElements.length > 0 && !this.autoStarted) {
        console.log('🎬 Meeting started, beginning transcription...')
        this.startAutomaticTranscription()
      }
    })

    this.meetingObserver.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  async startAutomaticTranscription() {
    if (this.autoStarted) return
    this.autoStarted = true

    try {
      console.log('🎤 Starting automatic meeting transcription...')
      this.isTranscribing = true
      this.transcriptContainer.style.display = 'block'

      // Request tab audio capture using Chrome extension API
      this.requestTabAudioCapture()

    } catch (error) {
      console.error('❌ Failed to start automatic transcription:', error)
      this.showError('Failed to start meeting transcription: ' + error.message)
    }
  }

  requestTabAudioCapture() {
    // Simplified approach: just use microphone for now
    // This captures the user's audio during the meeting
    this.fallbackToMicrophone()

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'receiveAudioStream' && message.stream) {
        console.log('📡 Received audio stream from background')
        this.setupAudioProcessing(message.stream)
        this.connectWebSocket()
      }
    })
  }

  async fallbackToMicrophone() {
    try {
      console.log('📱 Falling back to microphone capture...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Enhanced audio quality settings for better transcription
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,

          // Higher quality audio capture
          sampleRate: 44100, // Higher sample rate for better quality
          sampleSize: 16,
          channelCount: 1,

          // Advanced audio processing
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          googAudioMirroring: false
        }
      })

      this.mediaStream = stream
      this.setupAudioProcessing(stream)
      this.connectWebSocket()

    } catch (error) {
      console.error('❌ Failed to access microphone:', error)
      this.showError('Please allow microphone access for transcription')
    }
  }

  async startTranscription() {
    if (this.isTranscribing) return
    this.startAutomaticTranscription()
  }

  setupAudioProcessing(stream) {
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    const source = this.audioContext.createMediaStreamSource(stream)

    // Create a script processor (deprecated but widely supported)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

    this.processor.onaudioprocess = (event) => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        const inputBuffer = event.inputBuffer.getChannelData(0)

        // Convert float32 to int16
        const int16Buffer = new Int16Array(inputBuffer.length)
        for (let i = 0; i < inputBuffer.length; i++) {
          int16Buffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768))
        }

        // Send audio data to WebSocket
        this.websocket.send(int16Buffer.buffer)
      }
    }

    source.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }

  connectWebSocket() {
    try {
      this.websocket = new WebSocket('ws://localhost:8080')

      this.websocket.onopen = () => {
        console.log('✅ Whisper Large WebSocket connected for transcription')
        this.showMessage('🎤 Whisper Large listening...')
        this.updateConnectionStatus('connected')
      }

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'ready':
              console.log('✅ Whisper Large transcription ready:', data.model)
              this.showMessage(`🤖 ${data.model} ready - Auto language detection enabled`)
              this.updateConnectionStatus('ready', data.model)
              break

            case 'transcript':
              this.handleWhisperTranscript(data)
              break

            case 'utterance_end':
              this.handleUtteranceEnd()
              break

            case 'error':
              console.error('❌ Whisper transcription error:', data.message)
              this.showError(`Whisper Error: ${data.message}`)
              this.updateConnectionStatus('error')
              break
          }
        } catch (parseError) {
          console.error('❌ Failed to parse WebSocket message:', parseError)
        }
      }

      this.websocket.onerror = (error) => {
        console.error('❌ Whisper WebSocket error:', error)
        this.showError('Connection error. Make sure the Whisper server is running.')
        this.updateConnectionStatus('error')

        // Attempt to reconnect
        if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnection()
        }
      }

      this.websocket.onclose = () => {
        console.log('🔌 Whisper WebSocket connection closed')
        this.updateConnectionStatus('disconnected')

        if (this.isTranscribing && !this.isReconnecting) {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection()
          } else {
            this.stopTranscription()
            this.showError('Connection lost. Maximum reconnection attempts reached.')
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to connect to Whisper WebSocket:', error)
      this.showError('Failed to connect to Whisper transcription server')
    }
  }

  handleWhisperTranscript(data) {
    // Whisper always returns final transcripts, so handle accordingly
    if (data.text && data.text.trim()) {
      // Update quality metrics
      this.updateQualityMetrics(data)

      // Add to final transcripts with enhanced data
      const transcriptEntry = {
        text: data.text,
        timestamp: new Date(data.timestamp),
        confidence: data.confidence || 0.9,
        model: data.model || 'whisper-large',
        processing_time: data.processing_time || 0,
        words: data.words || [],
        chunk_id: data.chunk_id || 0
      }

      this.finalTranscripts.push(transcriptEntry)

      // Detect potential speaker changes based on audio patterns or pauses
      this.detectSpeakerChange(transcriptEntry)

      console.log(`📝 Whisper transcript added: "${data.text}" (${Math.round(data.confidence * 100)}% confidence, ${data.processing_time}ms)`)
    }

    this.updateTranscriptDisplay()
    this.updateStatsDisplay()
  }

  handleTranscript(data) {
    // Fallback method for compatibility
    this.handleWhisperTranscript(data)
  }

  handleUtteranceEnd() {
    // Clear current transcript when utterance ends
    this.currentTranscript = ''
    this.updateTranscriptDisplay()
  }

  updateTranscriptDisplay() {
    let html = ''

    // Show final transcripts with enhanced Whisper data
    this.finalTranscripts.slice(-8).forEach((transcript, index) => {
      const time = transcript.timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      const confidence = Math.round(transcript.confidence * 100)
      const speaker = transcript.speaker || this.detectSpeakerFromTranscript(transcript)
      const processingTime = transcript.processing_time || 0

      // Color coding based on confidence
      let confidenceColor = '#4ade80' // Green for high confidence
      if (confidence < 70) confidenceColor = '#ef4444' // Red for low confidence
      else if (confidence < 85) confidenceColor = '#f59e0b' // Yellow for medium confidence

      // Speaker indicator
      const speakerIndicator = speaker ? `<span style="color: #60a5fa !important; font-weight: 600 !important; margin-right: 4px !important;">${speaker}:</span>` : ''

      html += `
        <div style="margin-bottom: 10px !important; padding: 8px !important; background: rgba(255, 255, 255, 0.05) !important; border-radius: 6px !important; opacity: ${0.7 + (index * 0.04)} !important;">
          <div style="display: flex !important; justify-content: space-between !important; align-items: flex-start !important; margin-bottom: 4px !important;">
            <span style="color: #888 !important; font-size: 11px !important;">[${time}] ${transcript.model || 'whisper-large'}</span>
            <span style="color: ${confidenceColor} !important; font-size: 10px !important;">${confidence}%${processingTime > 0 ? ` • ${processingTime}ms` : ''}</span>
          </div>
          <div style="font-size: 14px !important; line-height: 1.4 !important;">
            ${speakerIndicator}${transcript.text}
          </div>
        </div>
      `
    })

    // Show current interim transcript (for compatibility, though Whisper doesn't use interim)
    if (this.currentTranscript) {
      html += `
        <div style="color: #4ade80 !important; font-weight: 500 !important; padding: 8px !important; background: rgba(74, 222, 128, 0.1) !important; border-radius: 6px !important; margin-top: 8px !important;">
          <span style="color: #888 !important; font-size: 12px !important;">[Processing...]</span>
          <span style="margin-left: 8px !important;">${this.currentTranscript}</span>
        </div>
      `
    }

    // Show processing indicator when Whisper is working
    if (this.isTranscribing && this.finalTranscripts.length === 0) {
      html += `
        <div style="text-align: center !important; color: #60a5fa !important; font-style: italic !important; padding: 20px !important;">
          🤖 Whisper Large is listening and processing audio chunks...
        </div>
      `
    }

    this.transcriptContent.innerHTML = html

    // Auto-scroll to bottom
    this.transcriptContent.scrollTop = this.transcriptContent.scrollHeight
  }

  showMessage(message) {
    this.transcriptContent.innerHTML = `
      <div style="color: #4ade80 !important; text-align: center !important; font-weight: 500 !important;">
        ${message}
      </div>
    `
  }

  showError(message) {
    this.transcriptContent.innerHTML = `
      <div style="color: #ef4444 !important; text-align: center !important;">
        ❌ ${message}
      </div>
    `
  }

  stopTranscription() {
    console.log('🛑 Stopping real-time transcription...')

    this.isTranscribing = false
    this.transcriptContainer.style.display = 'none'

    // Clean up WebSocket
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    // Clean up audio
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    // Clear transcripts
    this.currentTranscript = ''
    this.finalTranscripts = []
  }

  toggleTranscription() {
    if (this.isTranscribing) {
      this.stopTranscription()
    } else {
      this.startTranscription()
    }
  }

  // Enhanced methods for Whisper Large support

  setupActivityMonitoring() {
    // Monitor for periods of silence to optimize Whisper chunking
    setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime
      if (timeSinceActivity > 30000 && this.isTranscribing) {
        console.log('📊 Long silence detected, optimizing for Whisper performance')
      }
    }, 10000)
  }

  updateQualityMetrics(data) {
    if (data.confidence !== undefined) {
      this.transcriptionQuality.totalTranscripts++
      this.transcriptionQuality.averageConfidence =
        (this.transcriptionQuality.averageConfidence * (this.transcriptionQuality.totalTranscripts - 1) + data.confidence) / this.transcriptionQuality.totalTranscripts

      if (data.confidence < 0.7) {
        this.transcriptionQuality.lowConfidenceCount++
      }
    }

    // Update quality indicator
    this.updateQualityIndicator()
  }

  updateQualityIndicator() {
    if (!this.qualityIndicator) return

    const avgConfidence = this.transcriptionQuality.averageConfidence
    const lowConfidenceRate = this.transcriptionQuality.lowConfidenceCount / Math.max(this.transcriptionQuality.totalTranscripts, 1)

    let quality = 'High Quality'
    let color = '#4ade80'
    let bgColor = 'rgba(74, 222, 128, 0.2)'

    if (avgConfidence < 0.7 || lowConfidenceRate > 0.3) {
      quality = 'Low Quality'
      color = '#ef4444'
      bgColor = 'rgba(239, 68, 68, 0.2)'
    } else if (avgConfidence < 0.85 || lowConfidenceRate > 0.15) {
      quality = 'Medium Quality'
      color = '#f59e0b'
      bgColor = 'rgba(245, 158, 11, 0.2)'
    }

    this.qualityIndicator.textContent = quality
    this.qualityIndicator.style.color = color
    this.qualityIndicator.style.background = bgColor
  }

  updateConnectionStatus(status, model = null) {
    // Update connection status in the UI
    if (this.statsBar) {
      let statusText = ''
      let statusColor = '#888'

      switch (status) {
        case 'connected':
          statusText = '🔗 Connected'
          statusColor = '#4ade80'
          break
        case 'ready':
          statusText = `🤖 ${model || 'Whisper'} Ready`
          statusColor = '#4ade80'
          break
        case 'disconnected':
          statusText = '🔌 Disconnected'
          statusColor = '#ef4444'
          break
        case 'error':
          statusText = '❌ Error'
          statusColor = '#ef4444'
          break
        case 'reconnecting':
          statusText = '🔄 Reconnecting...'
          statusColor = '#f59e0b'
          break
      }

      this.connectionStatus = status
      this.updateStatsDisplay()
    }
  }

  updateStatsDisplay() {
    if (!this.statsBar) return

    const totalTranscripts = this.finalTranscripts.length
    const avgConfidence = Math.round(this.transcriptionQuality.averageConfidence * 100)
    const processingTimes = this.finalTranscripts
      .map(t => t.processing_time || 0)
      .filter(t => t > 0)
    const avgProcessingTime = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0

    let statusColor = '#4ade80'
    if (this.connectionStatus === 'error' || this.connectionStatus === 'disconnected') {
      statusColor = '#ef4444'
    } else if (this.connectionStatus === 'reconnecting') {
      statusColor = '#f59e0b'
    }

    this.statsBar.innerHTML = `
      <div style="display: flex !important; gap: 16px !important; align-items: center !important;">
        <span style="color: ${statusColor} !important;">● Whisper Large</span>
        <span>Segments: ${totalTranscripts}</span>
        <span>Avg Confidence: ${avgConfidence}%</span>
        ${avgProcessingTime > 0 ? `<span>Avg Speed: ${avgProcessingTime}ms</span>` : ''}
      </div>
      <div style="color: rgba(255, 255, 255, 0.6) !important;">
        Language: ${this.language} ${this.translateTo ? `→ ${this.translateTo}` : ''}
      </div>
    `
  }

  detectSpeakerChange(transcript) {
    // Simple speaker detection based on timing gaps
    if (this.finalTranscripts.length > 1) {
      const previousTranscript = this.finalTranscripts[this.finalTranscripts.length - 2]
      const timeDiff = transcript.timestamp - previousTranscript.timestamp

      // If there's a significant gap (>5 seconds), likely a speaker change
      if (timeDiff > 5000) {
        const speakerCount = this.speakers.size + 1
        const speakerName = `Speaker ${speakerCount}`
        this.speakers.set(speakerName, transcript.timestamp)
        transcript.speaker = speakerName
        this.currentSpeaker = speakerName
      } else {
        transcript.speaker = this.currentSpeaker || 'Speaker 1'
      }
    } else {
      transcript.speaker = 'Speaker 1'
      this.currentSpeaker = 'Speaker 1'
      this.speakers.set('Speaker 1', transcript.timestamp)
    }
  }

  detectSpeakerFromTranscript(transcript) {
    return transcript.speaker || this.currentSpeaker || 'Speaker 1'
  }

  attemptReconnection() {
    if (this.isReconnecting) return

    this.isReconnecting = true
    this.reconnectAttempts++

    console.log(`🔄 Attempting to reconnect to Whisper server (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.updateConnectionStatus('reconnecting')

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket()
      this.isReconnecting = false

      // Reset reconnect attempts on successful connection
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.reconnectAttempts = 0
      }
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)) // Exponential backoff, max 10s
  }

  changeLanguage(newLanguage) {
    this.language = newLanguage
    console.log(`🌐 Language changed to: ${newLanguage}`)

    // Restart transcription with new language if currently running
    if (this.isTranscribing) {
      this.showMessage(`🌐 Switching to ${newLanguage}...`)
      // Note: Whisper auto-detects language, so this is mainly for UI purposes
    }
  }

  showSettings() {
    // Create settings modal for Whisper configuration
    const modal = document.createElement('div')
    modal.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 99999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    const settingsPanel = document.createElement('div')
    settingsPanel.style.cssText = `
      background: rgba(0, 0, 0, 0.95) !important;
      color: white !important;
      padding: 24px !important;
      border-radius: 12px !important;
      max-width: 400px !important;
      width: 90% !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    `

    settingsPanel.innerHTML = `
      <h3 style="margin: 0 0 16px 0 !important; color: white !important;">🤖 Whisper Large Settings</h3>

      <div style="margin-bottom: 16px !important;">
        <label style="display: block !important; margin-bottom: 8px !important; color: rgba(255, 255, 255, 0.9) !important;">Model: Whisper Large (Auto-detected)</label>
        <div style="padding: 8px !important; background: rgba(255, 255, 255, 0.1) !important; border-radius: 4px !important; font-size: 12px !important;">
          ✅ Highest accuracy model<br>
          🌐 Multi-language support<br>
          📊 Word-level timestamps<br>
          🎯 Speaker detection
        </div>
      </div>

      <div style="margin-bottom: 16px !important;">
        <label style="display: block !important; margin-bottom: 8px !important; color: rgba(255, 255, 255, 0.9) !important;">Quality Metrics:</label>
        <div style="font-size: 12px !important; color: rgba(255, 255, 255, 0.7) !important;">
          Avg Confidence: ${Math.round(this.transcriptionQuality.averageConfidence * 100)}%<br>
          Total Segments: ${this.transcriptionQuality.totalTranscripts}<br>
          Low Quality: ${this.transcriptionQuality.lowConfidenceCount}
        </div>
      </div>

      <div style="display: flex !important; gap: 8px !important; justify-content: flex-end !important;">
        <button id="whisper-close-settings" style="padding: 8px 16px !important; background: rgba(107, 114, 128, 0.8) !important; color: white !important; border: none !important; border-radius: 4px !important; cursor: pointer !important;">Close</button>
      </div>
    `

    modal.appendChild(settingsPanel)
    document.body.appendChild(modal)

    // Close settings
    modal.querySelector('#whisper-close-settings').onclick = () => {
      document.body.removeChild(modal)
    }

    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    }
  }

  // Enhanced export with Whisper-specific data
  exportTranscript() {
    if (this.finalTranscripts.length === 0) {
      alert('No transcript to export')
      return
    }

    // Create detailed transcript with Whisper metadata
    let transcript = `Whisper Large Transcript\n`
    transcript += `Generated: ${new Date().toLocaleString()}\n`
    transcript += `Model: Whisper Large\n`
    transcript += `Language: ${this.language}\n`
    transcript += `Total Segments: ${this.finalTranscripts.length}\n`
    transcript += `Average Confidence: ${Math.round(this.transcriptionQuality.averageConfidence * 100)}%\n`
    transcript += `\n${'='.repeat(50)}\n\n`

    this.finalTranscripts.forEach((t, index) => {
      const time = t.timestamp.toLocaleTimeString()
      const speaker = t.speaker || 'Unknown'
      const confidence = Math.round(t.confidence * 100)
      const processingTime = t.processing_time || 0

      transcript += `[${time}] ${speaker} (${confidence}%${processingTime > 0 ? `, ${processingTime}ms` : ''})\n`
      transcript += `${t.text}\n\n`

      // Add word-level timestamps if available
      if (t.words && t.words.length > 0) {
        transcript += `Word timestamps: ${t.words.map(w => `${w.word}(${w.start?.toFixed(2)}s)`).join(' ')}\n\n`
      }
    })

    const blob = new Blob([transcript], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `whisper-transcript-${new Date().toISOString().slice(0, 19)}.txt`
    a.click()

    URL.revokeObjectURL(url)
  }
}

// Initialize real-time transcriber
window.realtimeTranscriber = new RealtimeTranscriber()

// Export for use by other scripts
window.RealtimeTranscriber = RealtimeTranscriber