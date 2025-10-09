// Google Meet Recorder - Professional UI matching dashboard
console.log('🎬 Professional Recorder Loading...')

class ProfessionalRecorder {
  constructor() {
    this.recording = false
    this.chunks = []
    this.recorder = null
    this.startTime = null
    this.timerInterval = null
    this.collapsed = true // Start collapsed
    this.autoRecordEnabled = false
    this.meetingDetected = false
    this.meetingObserver = null
    this.lastParticipantCount = 0
    this.micStream = null
    this.screenStream = null
    this.audioContext = null
    this.uploadRetries = 0
    this.maxUploadRetries = 3
    this.streamHealthCheckInterval = null
    this.recordingDataSize = 0
    this.lastDataCheck = 0
    this.participantStableTime = null
    this.meetingEndTime = null

    this.createUI()
    this.setupAutoRecording()
    this.setupKeyboardShortcuts()
  }

  createUI() {
    // Create main container with Shadcn-style design
    const container = document.createElement('div')
    container.id = 'professional-recorder'
    container.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 99999 !important;
      width: 320px !important;
      background: white !important;
      border: 1px solid hsl(214.3 31.8% 91.4%) !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
    `

    // Header
    const header = document.createElement('div')
    header.style.cssText = `
      padding: 16px 20px 12px 20px !important;
      border-bottom: 1px solid hsl(214.3 31.8% 91.4%) !important;
    `

    const headerTitle = document.createElement('div')
    headerTitle.style.cssText = `
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      margin-bottom: 4px !important;
    `

    const titleLeft = document.createElement('div')
    titleLeft.style.cssText = `
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    `

    const titleIcon = document.createElement('div')
    titleIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    `
    titleIcon.style.cssText = `
      color: hsl(221.2 83.2% 53.3%) !important;
    `

    const title = document.createElement('h3')
    title.textContent = 'Meet Recorder'
    title.style.cssText = `
      margin: 0 !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      color: hsl(222.2 84% 4.9%) !important;
    `

    // Collapse/Expand button
    this.collapseBtn = document.createElement('button')
    this.collapseBtn.style.cssText = `
      background: none !important;
      border: none !important;
      padding: 4px !important;
      border-radius: 4px !important;
      cursor: pointer !important;
      color: hsl(215.4 16.3% 46.9%) !important;
      transition: all 0.2s ease !important;
    `
    this.collapseBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    `

    this.collapseBtn.addEventListener('mouseenter', () => {
      this.collapseBtn.style.background = 'hsl(210 40% 98%) !important'
    })
    this.collapseBtn.addEventListener('mouseleave', () => {
      this.collapseBtn.style.background = 'none !important'
    })
    this.collapseBtn.addEventListener('click', () => {
      this.toggleCollapse()
    })

    const subtitle = document.createElement('p')
    subtitle.textContent = 'Record meetings with audio & video'
    subtitle.style.cssText = `
      margin: 0 !important;
      font-size: 13px !important;
      color: hsl(215.4 16.3% 46.9%) !important;
    `

    titleLeft.appendChild(titleIcon)
    titleLeft.appendChild(title)
    headerTitle.appendChild(titleLeft)
    headerTitle.appendChild(this.collapseBtn)
    header.appendChild(headerTitle)

    this.subtitle = subtitle
    header.appendChild(subtitle)

    // Collapsible content container
    this.collapsibleContent = document.createElement('div')
    this.collapsibleContent.style.cssText = `
      overflow: hidden !important;
      transition: max-height 0.3s ease, opacity 0.3s ease !important;
      max-height: 1000px !important;
      opacity: 1 !important;
    `

    // Status section
    const statusSection = document.createElement('div')
    statusSection.style.cssText = `
      padding: 16px 20px !important;
    `

    // Status indicator
    this.statusDiv = document.createElement('div')
    this.statusDiv.style.cssText = `
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 8px 12px !important;
      background: hsl(210 40% 98%) !important;
      border: 1px solid hsl(214.3 31.8% 91.4%) !important;
      border-radius: 6px !important;
      margin-bottom: 12px !important;
    `

    this.statusIcon = document.createElement('div')
    this.statusIcon.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    `
    this.statusIcon.style.cssText = `
      color: hsl(142.1 76.2% 36.3%) !important;
      flex-shrink: 0 !important;
    `

    this.statusText = document.createElement('span')
    this.statusText.textContent = 'Ready to record'
    this.statusText.style.cssText = `
      font-size: 14px !important;
      font-weight: 500 !important;
      color: hsl(222.2 84% 4.9%) !important;
    `

    this.statusDiv.appendChild(this.statusIcon)
    this.statusDiv.appendChild(this.statusText)

    // Timer
    this.timerDiv = document.createElement('div')
    this.timerDiv.style.cssText = `
      text-align: center !important;
      font-size: 24px !important;
      font-weight: 700 !important;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace !important;
      color: hsl(222.2 84% 4.9%) !important;
      margin-bottom: 8px !important;
      letter-spacing: 1px !important;
    `
    this.timerDiv.textContent = '00:00'

    // Recording size display
    this.sizeDiv = document.createElement('div')
    this.sizeDiv.style.cssText = `
      text-align: center !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      color: hsl(215.4 16.3% 46.9%) !important;
      margin-bottom: 16px !important;
      display: none !important;
    `
    this.sizeDiv.textContent = '0 MB'

    // Progress bar (hidden by default)
    this.progressContainer = document.createElement('div')
    this.progressContainer.style.cssText = `
      display: none !important;
      margin-bottom: 16px !important;
    `

    const progressLabel = document.createElement('div')
    progressLabel.style.cssText = `
      font-size: 12px !important;
      color: hsl(215.4 16.3% 46.9%) !important;
      margin-bottom: 6px !important;
      display: flex !important;
      justify-content: space-between !important;
    `

    this.progressText = document.createElement('span')
    this.progressText.textContent = 'Uploading...'

    this.progressPercent = document.createElement('span')
    this.progressPercent.textContent = '0%'

    progressLabel.appendChild(this.progressText)
    progressLabel.appendChild(this.progressPercent)

    const progressBarBg = document.createElement('div')
    progressBarBg.style.cssText = `
      width: 100% !important;
      height: 6px !important;
      background: hsl(210 40% 98%) !important;
      border-radius: 3px !important;
      overflow: hidden !important;
    `

    this.progressBar = document.createElement('div')
    this.progressBar.style.cssText = `
      width: 0% !important;
      height: 100% !important;
      background: hsl(221.2 83.2% 53.3%) !important;
      transition: width 0.3s ease !important;
    `

    progressBarBg.appendChild(this.progressBar)
    this.progressContainer.appendChild(progressLabel)
    this.progressContainer.appendChild(progressBarBg)

    statusSection.appendChild(this.statusDiv)
    statusSection.appendChild(this.timerDiv)
    statusSection.appendChild(this.sizeDiv)
    statusSection.appendChild(this.progressContainer)

    // Controls section
    const controlsSection = document.createElement('div')
    controlsSection.style.cssText = `
      padding: 0 20px 20px 20px !important;
    `

    // Meeting name input
    const nameLabel = document.createElement('label')
    nameLabel.textContent = 'Meeting Name'
    nameLabel.style.cssText = `
      display: block !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      color: hsl(222.2 84% 4.9%) !important;
      margin-bottom: 6px !important;
    `

    this.nameInput = document.createElement('input')
    this.nameInput.type = 'text'
    this.nameInput.placeholder = 'Enter meeting name (optional)'
    this.nameInput.style.cssText = `
      width: 100% !important;
      height: 36px !important;
      padding: 8px 12px !important;
      border: 1px solid hsl(214.3 31.8% 91.4%) !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      background: white !important;
      margin-bottom: 16px !important;
      box-sizing: border-box !important;
      transition: border-color 0.2s ease !important;
    `

    this.nameInput.addEventListener('focus', () => {
      this.nameInput.style.borderColor = 'hsl(222.2 84% 4.9%) !important'
      this.nameInput.style.outline = 'none !important'
    })

    this.nameInput.addEventListener('blur', () => {
      this.nameInput.style.borderColor = 'hsl(214.3 31.8% 91.4%) !important'
    })

    // Auto-generate meeting name from URL
    this.autoFillMeetingName()

    // Auto-record toggle
    const autoRecordDiv = document.createElement('div')
    autoRecordDiv.style.cssText = `
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      margin-bottom: 16px !important;
      padding: 8px 12px !important;
      background: hsl(210 40% 98%) !important;
      border: 1px solid hsl(214.3 31.8% 91.4%) !important;
      border-radius: 6px !important;
    `

    this.autoRecordCheckbox = document.createElement('input')
    this.autoRecordCheckbox.type = 'checkbox'
    this.autoRecordCheckbox.id = 'auto-record-toggle'
    this.autoRecordCheckbox.checked = this.autoRecordEnabled
    this.autoRecordCheckbox.style.cssText = `
      width: 16px !important;
      height: 16px !important;
      accent-color: hsl(222.2 84% 4.9%) !important;
    `

    const autoRecordLabel = document.createElement('label')
    autoRecordLabel.htmlFor = 'auto-record-toggle'
    autoRecordLabel.textContent = 'Auto-record when meeting starts'
    autoRecordLabel.style.cssText = `
      font-size: 13px !important;
      color: hsl(222.2 84% 4.9%) !important;
      cursor: pointer !important;
      user-select: none !important;
    `

    this.autoStatusDiv = document.createElement('div')
    this.autoStatusDiv.style.cssText = `
      font-size: 11px !important;
      color: hsl(215.4 16.3% 46.9%) !important;
      margin-top: 4px !important;
      display: none !important;
    `

    this.autoRecordCheckbox.addEventListener('change', () => {
      this.autoRecordEnabled = this.autoRecordCheckbox.checked
      this.saveSettings()
      if (this.autoRecordEnabled) {
        this.updateStatus('Auto-record enabled - will start when meeting begins', 'info')
        this.autoStatusDiv.textContent = '🤖 Monitoring for meeting start...'
        this.autoStatusDiv.style.display = 'block'
      } else {
        this.updateStatus('Auto-record disabled', 'info')
        this.autoStatusDiv.style.display = 'none'
      }
    })

    const autoRecordContent = document.createElement('div')
    autoRecordContent.style.cssText = 'flex: 1 !important;'
    autoRecordContent.appendChild(autoRecordLabel)
    autoRecordContent.appendChild(this.autoStatusDiv)

    autoRecordDiv.appendChild(this.autoRecordCheckbox)
    autoRecordDiv.appendChild(autoRecordContent)

    // Main record button
    this.recordBtn = document.createElement('button')
    this.recordBtn.style.cssText = `
      width: 100% !important;
      height: 44px !important;
      background: hsl(222.2 84% 4.9%) !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      margin-bottom: 12px !important;
    `

    this.updateRecordButton('ready')

    // Request Bot button
    this.requestBotBtn = document.createElement('button')
    this.requestBotBtn.style.cssText = `
      width: 100% !important;
      height: 44px !important;
      background: hsl(142.1 76.2% 36.3%) !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      margin-bottom: 12px !important;
    `
    this.requestBotBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <circle cx="12" cy="5" r="2"/>
        <path d="M12 7v4"/>
        <line x1="8" y1="16" x2="8" y2="16"/>
        <line x1="16" y1="16" x2="16" y2="16"/>
      </svg>
      <span>Request Bot Recording</span>
    `

    this.requestBotBtn.addEventListener('click', () => {
      this.requestBotRecording()
    })

    this.recordBtn.addEventListener('mouseenter', () => {
      if (!this.recording) {
        this.recordBtn.style.background = 'hsl(222.2 84% 8%) !important'
        this.recordBtn.style.transform = 'translateY(-1px) !important'
        this.recordBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15) !important'
      }
    })

    this.recordBtn.addEventListener('mouseleave', () => {
      if (!this.recording) {
        this.recordBtn.style.background = 'hsl(222.2 84% 4.9%) !important'
        this.recordBtn.style.transform = 'translateY(0) !important'
        this.recordBtn.style.boxShadow = 'none !important'
      }
    })

    this.recordBtn.addEventListener('click', () => {
      if (this.recording) {
        this.stop()
      } else {
        this.start()
      }
    })

    // Audio/Video indicators
    const indicatorsDiv = document.createElement('div')
    indicatorsDiv.style.cssText = `
      display: flex !important;
      gap: 8px !important;
    `

    this.audioIndicator = this.createIndicator('Audio', 'microphone')
    this.videoIndicator = this.createIndicator('Video', 'video')

    indicatorsDiv.appendChild(this.audioIndicator)
    indicatorsDiv.appendChild(this.videoIndicator)

    controlsSection.appendChild(nameLabel)
    controlsSection.appendChild(this.nameInput)
    controlsSection.appendChild(autoRecordDiv)
    controlsSection.appendChild(this.recordBtn)
    controlsSection.appendChild(this.requestBotBtn)
    controlsSection.appendChild(indicatorsDiv)

    // Assemble collapsible content
    this.collapsibleContent.appendChild(statusSection)
    this.collapsibleContent.appendChild(controlsSection)

    // Assemble everything
    container.appendChild(header)
    container.appendChild(this.collapsibleContent)

    document.body.appendChild(container)

    // Set initial collapsed state
    this.updateCollapseState()

    console.log('✅ Professional UI created')
  }

  createIndicator(label, iconType) {
    const indicator = document.createElement('div')
    indicator.style.cssText = `
      flex: 1 !important;
      padding: 8px 12px !important;
      background: hsl(210 40% 98%) !important;
      border: 1px solid hsl(214.3 31.8% 91.4%) !important;
      border-radius: 6px !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    `

    const icon = document.createElement('div')
    icon.style.cssText = `
      color: hsl(215.4 16.3% 46.9%) !important;
      flex-shrink: 0 !important;
    `

    if (iconType === 'microphone') {
      icon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      `
    } else {
      icon.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      `
    }

    const text = document.createElement('span')
    text.textContent = label
    text.style.cssText = `
      font-size: 12px !important;
      font-weight: 500 !important;
      color: hsl(215.4 16.3% 46.9%) !important;
    `

    indicator.appendChild(icon)
    indicator.appendChild(text)

    return indicator
  }

  updateRecordButton(state) {
    const states = {
      ready: {
        text: 'Start Recording',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10"/></svg>`,
        bg: 'hsl(222.2 84% 4.9%)',
        color: 'white'
      },
      recording: {
        text: 'Stop Recording',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="6" height="6" rx="1"/></svg>`,
        bg: 'hsl(0 84.2% 60.2%)',
        color: 'white'
      },
      processing: {
        text: 'Processing...',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>`,
        bg: 'hsl(25 95% 53%)',
        color: 'white'
      },
      uploading: {
        text: 'Uploading...',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        bg: 'hsl(221.2 83.2% 53.3%)',
        color: 'white'
      },
      success: {
        text: 'Saved!',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
        bg: 'hsl(142.1 76.2% 36.3%)',
        color: 'white'
      },
      error: {
        text: 'Failed',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        bg: 'hsl(0 84.2% 60.2%)',
        color: 'white'
      }
    }

    const config = states[state]
    this.recordBtn.innerHTML = `${config.icon}<span>${config.text}</span>`
    this.recordBtn.style.background = `${config.bg} !important`
    this.recordBtn.style.color = `${config.color} !important`
  }

  updateStatus(text, type = 'info') {
    this.statusText.textContent = text

    const icons = {
      info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>`,
      recording: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10"/></svg>`,
      success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
      error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    }

    const colors = {
      info: 'hsl(142.1 76.2% 36.3%)',
      recording: 'hsl(0 84.2% 60.2%)',
      success: 'hsl(142.1 76.2% 36.3%)',
      error: 'hsl(0 84.2% 60.2%)'
    }

    this.statusIcon.innerHTML = icons[type]
    this.statusIcon.style.color = `${colors[type]} !important`
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed
    this.updateCollapseState()
  }

  updateCollapseState() {
    const collapseIcon = this.collapseBtn.querySelector('div')

    if (this.collapsed) {
      this.collapsibleContent.style.maxHeight = '0'
      this.collapsibleContent.style.opacity = '0'
      collapseIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6,9 12,15 18,9"/></svg>`

      // After animation, hide completely
      setTimeout(() => {
        if (this.collapsed) {
          this.collapsibleContent.style.display = 'none'
        }
      }, 300)
    } else {
      this.collapsibleContent.style.display = 'block'
      // Allow reflow
      requestAnimationFrame(() => {
        this.collapsibleContent.style.maxHeight = '1000px'
        this.collapsibleContent.style.opacity = '1'
      })
      collapseIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18,15 12,9 6,15"/></svg>`
    }
  }

  autoFillMeetingName() {
    try {
      // Try to get meeting name from Google Meet UI
      let meetingName = this.extractMeetingNameFromUI()

      if (!meetingName) {
        // Fallback to URL-based naming
        const url = window.location.href
        const meetingId = url.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/)?.[1]
        if (meetingId) {
          const now = new Date()
          const dateStr = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          meetingName = `Meeting ${dateStr}`
        }
      }

      if (meetingName) {
        this.nameInput.value = meetingName
      }
    } catch (error) {
      console.log('Could not auto-fill meeting name:', error)
    }
  }

  extractMeetingNameFromUI() {
    try {
      // Try multiple selectors to find meeting name in Google Meet
      const selectors = [
        '[data-meeting-title]',
        '[jsname="r4nke"]', // Google Meet title element
        'h1[role="heading"]',
        '[data-call-title]',
        '.google-material-icons + span', // Title next to meeting icon
        '[data-meeting-name]'
      ]

      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element && element.textContent && element.textContent.trim() !== '') {
          const text = element.textContent.trim()
          // Filter out generic meet text
          if (!text.toLowerCase().includes('meet.google.com') &&
              !text.toLowerCase().includes('google meet') &&
              text.length > 3 && text.length < 100) {
            console.log('Found meeting name:', text)
            return text
          }
        }
      }

      // Try to find meeting name in the page title
      const pageTitle = document.title
      if (pageTitle && !pageTitle.includes('Meet - ') && !pageTitle.includes('Google Meet')) {
        const cleanTitle = pageTitle.replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '').trim()
        if (cleanTitle.length > 3 && cleanTitle.length < 100) {
          console.log('Found meeting name in title:', cleanTitle)
          return cleanTitle
        }
      }

      return null
    } catch (error) {
      console.log('Error extracting meeting name:', error)
      return null
    }
  }

  updateIndicator(indicator, connected) {
    const icon = indicator.querySelector('div')
    const text = indicator.querySelector('span')

    if (connected) {
      indicator.style.background = 'hsl(142.1 70% 50% / 0.1) !important'
      indicator.style.borderColor = 'hsl(142.1 76.2% 36.3%) !important'
      icon.style.color = 'hsl(142.1 76.2% 36.3%) !important'
      text.style.color = 'hsl(142.1 76.2% 36.3%) !important'
      text.textContent = text.textContent.split(' ')[0] + ' ✓'
    } else {
      indicator.style.background = 'hsl(210 40% 98%) !important'
      indicator.style.borderColor = 'hsl(214.3 31.8% 91.4%) !important'
      icon.style.color = 'hsl(215.4 16.3% 46.9%) !important'
      text.style.color = 'hsl(215.4 16.3% 46.9%) !important'
      text.textContent = text.textContent.split(' ')[0]
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (this.recording && this.startTime) {
        const elapsed = Date.now() - this.startTime
        const minutes = Math.floor(elapsed / 60000)
        const seconds = Math.floor((elapsed % 60000) / 1000)
        this.timerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

        // Update size display
        if (this.recordingDataSize > 0) {
          const sizeMB = (this.recordingDataSize / 1024 / 1024).toFixed(1)
          this.sizeDiv.textContent = `${sizeMB} MB`
          this.sizeDiv.style.display = 'block'
        }
      }
    }, 1000)
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  async start() {
    try {
      // Get configured API URL
      this.apiUrl = await getApiUrl()
      console.log('📡 Using API URL:', this.apiUrl)

      // Check if user is logged in first
      this.updateStatus('Checking authentication...', 'info')
      this.updateRecordButton('processing')
      this.recordBtn.disabled = true

      this.userId = null
      try {
        const sessionResponse = await fetch(`${this.apiUrl}/api/check-session`, {
          credentials: 'include'
        })
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          if (sessionData.user?.id) {
            this.userId = sessionData.user.id
            console.log('✅ User authenticated:', this.userId)
          }
        }
      } catch (err) {
        console.error('Failed to check authentication:', err)
      }

      if (!this.userId) {
        throw new Error(`Please log in to ${this.apiUrl} first to use the recorder. Configure the URL in extension settings if needed.`)
      }

      this.updateStatus('Requesting permissions...', 'info')

      // Get microphone
      console.log('🎤 Getting microphone access...')
      this.updateStatus('Allow microphone access...', 'info')

      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 48000,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
      } catch (micError) {
        throw new Error('Microphone access denied. Please allow microphone access.')
      }

      this.updateIndicator(this.audioIndicator, true)
      console.log('✅ Microphone granted')

      // Get screen with audio
      console.log('🖥️ Getting screen with system audio...')
      this.updateStatus('Select screen to record...', 'info')

      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            sampleRate: 48000,
            channelCount: 2,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
      } catch (screenError) {
        // Clean up mic stream
        this.cleanupStreams()
        throw new Error('Screen sharing cancelled. Please select a screen to record.')
      }

      this.updateIndicator(this.videoIndicator, true)
      console.log('✅ Screen sharing granted')

      // Combine audio sources
      this.updateStatus('Setting up audio...', 'info')
      this.audioContext = new AudioContext()

      const micSource = this.audioContext.createMediaStreamSource(this.micStream)
      const screenAudioTracks = this.screenStream.getAudioTracks()

      const destination = this.audioContext.createMediaStreamDestination()

      // Always connect mic
      micSource.connect(destination)

      // Connect screen audio if available
      if (screenAudioTracks.length > 0) {
        const screenSource = this.audioContext.createMediaStreamSource(
          new MediaStream(screenAudioTracks)
        )
        screenSource.connect(destination)
        console.log('✅ System audio included')
      } else {
        console.log('⚠️ No system audio available, using microphone only')
      }

      const combinedStream = new MediaStream([
        ...this.screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ])

      console.log('🎵 Combined stream created')
      console.log('- Video tracks:', combinedStream.getVideoTracks().length)
      console.log('- Audio tracks:', combinedStream.getAudioTracks().length)

      // Set up recorder with error handling
      try {
        this.recorder = new MediaRecorder(combinedStream, {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 2500000
        })
      } catch (codecError) {
        // Fallback to default codec
        console.log('⚠️ VP9 not supported, using default codec')
        this.recorder = new MediaRecorder(combinedStream)
      }

      this.chunks = []
      this.recordingDataSize = 0
      this.lastDataCheck = Date.now()

      this.recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          this.chunks.push(e.data)
          this.recordingDataSize += e.data.size
          console.log('Data chunk:', e.data.size, 'Total:', this.recordingDataSize)
        }
      }

      this.recorder.onerror = (error) => {
        console.error('❌ MediaRecorder error:', error)
        this.handleRecordingError('Recording error occurred')
      }

      this.recorder.onstop = () => {
        this.uploadToFirebase()
      }

      // Handle stream ending (user stops sharing)
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('🛑 Screen sharing stopped by user')
        if (this.recording) {
          this.stop()
        }
      })

      // Start recording
      this.recorder.start(1000)
      this.recording = true
      this.startTime = Date.now()
      this.uploadRetries = 0

      this.recordBtn.disabled = false
      this.updateRecordButton('recording')
      this.updateStatus('Recording...', 'recording')
      this.startTimer()
      this.startStreamHealthCheck()

      // Add pulsing animation to status
      this.statusDiv.style.animation = 'pulse 2s ease-in-out infinite'
      this.addPulseAnimation()

      console.log('✅ Recording started')

    } catch (err) {
      console.error('❌ Error:', err)
      this.handleRecordingError(err.message || 'Failed to start recording')
      this.cleanupStreams()
    }
  }

  handleRecordingError(message) {
    this.updateStatus(message, 'error')
    this.updateRecordButton('error')
    this.recordBtn.disabled = false

    setTimeout(() => {
      this.updateRecordButton('ready')
      this.updateStatus('Ready to record', 'info')
    }, 4000)
  }

  cleanupStreams() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop())
      this.micStream = null
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.stopStreamHealthCheck()
    this.updateIndicator(this.audioIndicator, false)
    this.updateIndicator(this.videoIndicator, false)
  }

  startStreamHealthCheck() {
    this.streamHealthCheckInterval = setInterval(() => {
      if (!this.recording) return

      const now = Date.now()
      const timeSinceLastData = now - this.lastDataCheck

      // Check if we're getting data
      if (timeSinceLastData > 5000 && this.recordingDataSize === 0) {
        console.warn('⚠️ No recording data received in 5 seconds')
        this.updateStatus('Recording may not be working properly', 'error')
      }

      // Update last check
      if (this.recordingDataSize > 0) {
        this.lastDataCheck = now
      }

      // Log stream health
      if (this.recorder && this.recorder.state === 'recording') {
        console.log('Stream health check: OK, Size:', this.recordingDataSize, 'bytes')
      }
    }, 3000)
  }

  stopStreamHealthCheck() {
    if (this.streamHealthCheckInterval) {
      clearInterval(this.streamHealthCheckInterval)
      this.streamHealthCheckInterval = null
    }
  }

  stop() {
    if (this.recorder && this.recording) {
      try {
        this.recorder.stop()
        this.recording = false
        this.stopTimer()
        this.stopStreamHealthCheck()

        // Remove pulsing animation
        this.statusDiv.style.animation = 'none'

        this.recordBtn.disabled = true
        this.updateRecordButton('processing')
        this.updateStatus('Processing recording...', 'info')

        console.log('🛑 Stopped - Total recorded:', this.recordingDataSize, 'bytes')
      } catch (error) {
        console.error('❌ Error stopping recorder:', error)
        this.handleRecordingError('Error stopping recording')
        this.cleanupStreams()
      }
    }
  }

  addPulseAnimation() {
    // Add pulse keyframe animation if not already added
    if (!document.getElementById('recorder-pulse-animation')) {
      const style = document.createElement('style')
      style.id = 'recorder-pulse-animation'
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `
      document.head.appendChild(style)
    }
  }

  async uploadToFirebase() {
    try {
      console.log('📤 Uploading to Firebase...')

      // Validate recording data
      if (this.chunks.length === 0 || this.recordingDataSize === 0) {
        throw new Error('No recording data available')
      }

      this.updateRecordButton('uploading')
      this.updateStatus(`Uploading ${(this.recordingDataSize / 1024 / 1024).toFixed(1)}MB...`, 'info')

      // Show progress bar
      this.progressContainer.style.display = 'block'
      this.progressBar.style.width = '0%'
      this.progressPercent.textContent = '0%'

      const blob = new Blob(this.chunks, { type: 'video/webm' })
      console.log('Final blob size:', blob.size, 'bytes')

      const meetingName = this.nameInput.value.trim() || 'Untitled Meeting'

      // Use authenticated userId from start()
      console.log('📝 Uploading for user:', this.userId)

      const formData = new FormData()
      formData.append('video', blob, 'meeting-recording.webm')
      formData.append('meetUrl', window.location.href)
      formData.append('timestamp', this.startTime.toString())
      formData.append('duration', Date.now() - this.startTime)
      formData.append('meetingName', meetingName)
      formData.append('userId', this.userId)
      formData.append('deleteAfterUpload', 'true')

      // Add timeout to fetch
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 300000) // 5 minutes

      // Simulate upload progress (since we can't track real progress easily)
      const progressInterval = setInterval(() => {
        const currentWidth = parseFloat(this.progressBar.style.width) || 0
        if (currentWidth < 90) {
          const newWidth = Math.min(currentWidth + Math.random() * 10, 90)
          this.progressBar.style.width = newWidth + '%'
          this.progressPercent.textContent = Math.round(newWidth) + '%'
        }
      }, 500)

      try {
        const response = await fetch(`${this.apiUrl}/api/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearInterval(progressInterval)
        clearTimeout(timeout)

        // Complete progress bar
        this.progressBar.style.width = '100%'
        this.progressPercent.textContent = '100%'

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Upload failed (${response.status}): ${errorText}`)
        }

        const result = await response.json()
        console.log('✅ Upload successful:', result)

        // Success - cleanup and reset
        this.cleanupStreams()
        this.uploadRetries = 0
        this.recordBtn.disabled = false

        this.updateRecordButton('success')
        this.updateStatus('Recording saved to dashboard!', 'success')

        // Show download URL if available
        if (result.downloadURL) {
          console.log('📥 Download URL:', result.downloadURL)
        }

        // Hide progress bar after short delay
        setTimeout(() => {
          this.progressContainer.style.display = 'none'
        }, 1500)

        setTimeout(() => {
          this.updateRecordButton('ready')
          this.updateStatus('Ready to record', 'info')
          this.timerDiv.textContent = '00:00'
          this.sizeDiv.style.display = 'none'
          this.sizeDiv.textContent = '0 MB'
        }, 3000)

      } catch (fetchError) {
        clearInterval(progressInterval)
        clearTimeout(timeout)

        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout - file may be too large')
        }
        throw fetchError
      }

    } catch (error) {
      console.error('❌ Upload failed:', error)

      // Retry logic
      if (this.uploadRetries < this.maxUploadRetries &&
          !error.message.includes('No recording data')) {
        this.uploadRetries++
        console.log(`🔄 Retrying upload (${this.uploadRetries}/${this.maxUploadRetries})...`)

        this.updateStatus(`Retrying upload (${this.uploadRetries}/${this.maxUploadRetries})...`, 'info')

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.uploadRetries - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))

        return this.uploadToFirebase()
      }

      // Max retries reached or unrecoverable error
      this.cleanupStreams()
      this.recordBtn.disabled = false

      // Hide progress bar
      this.progressContainer.style.display = 'none'

      this.updateRecordButton('error')
      this.updateStatus(`Upload failed: ${error.message}`, 'error')

      // Offer to download locally as backup
      this.offerLocalDownload()

      setTimeout(() => {
        this.updateRecordButton('ready')
        this.updateStatus('Ready to record', 'info')
        this.timerDiv.textContent = '00:00'
        this.sizeDiv.style.display = 'none'
        this.sizeDiv.textContent = '0 MB'
      }, 5000)
    }
  }

  offerLocalDownload() {
    try {
      if (this.chunks.length === 0) return

      const blob = new Blob(this.chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-recording-${Date.now()}.webm`
      a.style.display = 'none'

      document.body.appendChild(a)

      // Show notification
      this.showNotification(
        '💾 Download Backup Available',
        'Click to download recording locally'
      )

      // Auto-trigger download after 2 seconds
      setTimeout(() => {
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log('💾 Local backup downloaded')
      }, 2000)

    } catch (error) {
      console.error('❌ Failed to create local backup:', error)
    }
  }

  setupAutoRecording() {
    // Load saved settings
    this.loadSettings()

    // Set up meeting detection
    this.detectMeetingState()

    // Set up observers for meeting changes
    this.setupMeetingObserver()

    console.log('🤖 Auto-recording setup complete')
  }

  saveSettings() {
    try {
      localStorage.setItem('logam-recorder-settings', JSON.stringify({
        autoRecordEnabled: this.autoRecordEnabled
      }))
    } catch (error) {
      console.log('Could not save settings:', error)
    }
  }

  loadSettings() {
    try {
      const settings = localStorage.getItem('logam-recorder-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        this.autoRecordEnabled = parsed.autoRecordEnabled || false
        if (this.autoRecordCheckbox) {
          this.autoRecordCheckbox.checked = this.autoRecordEnabled
        }
      }
    } catch (error) {
      console.log('Could not load settings:', error)
    }
  }

  setupMeetingObserver() {
    // Observe changes in the meeting
    this.meetingObserver = new MutationObserver(() => {
      this.detectMeetingState()
    })

    this.meetingObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    })

    // Also check periodically
    setInterval(() => {
      this.detectMeetingState()
    }, 5000)
  }

  detectMeetingState() {
    try {
      const participants = this.getParticipantCount()
      const inMeeting = this.isInActiveMeeting()

      // Update auto-record status
      if (this.autoRecordEnabled && this.autoStatusDiv) {
        if (inMeeting) {
          if (participants > 1) {
            this.autoStatusDiv.textContent = `🟢 ${participants} participants detected`
            this.autoStatusDiv.style.display = 'block'
          } else {
            this.autoStatusDiv.textContent = `🟡 In meeting, waiting for participants...`
            this.autoStatusDiv.style.display = 'block'
          }
        } else {
          this.autoStatusDiv.textContent = `🤖 Monitoring for meeting start...`
          this.autoStatusDiv.style.display = 'block'
        }
      }

      // Auto-start recording when meeting begins
      if (this.autoRecordEnabled && !this.recording && inMeeting && participants > 1) {
        // Require participant count to be stable for 3 seconds
        if (!this.meetingDetected) {
          if (this.lastParticipantCount === participants) {
            // Participant count is stable
            if (!this.participantStableTime) {
              this.participantStableTime = Date.now()
            } else if (Date.now() - this.participantStableTime > 3000) {
              // Stable for 3 seconds, start recording
              this.meetingDetected = true
              console.log('🤖 Auto-starting recording - participants:', participants)

              // Update meeting name one more time when meeting starts
              this.autoFillMeetingName()

              // Show notification
              this.showNotification(
                '🤖 Auto-recording starting...',
                `Meeting detected with ${participants} participants`
              )

              // Small delay to ensure meeting is fully loaded
              setTimeout(() => {
                if (this.isInActiveMeeting() && this.getParticipantCount() > 1) {
                  this.start()
                } else {
                  console.log('⚠️ Meeting state changed, cancelling auto-start')
                  this.meetingDetected = false
                  this.participantStableTime = null
                }
              }, 2000)
            }
          } else {
            // Participant count changed, reset stable time
            this.participantStableTime = null
          }
        }
      }

      // Auto-stop recording when meeting ends
      if (this.recording && this.meetingDetected && (!inMeeting || participants <= 1)) {
        // Require end condition to be stable for 5 seconds
        if (!this.meetingEndTime) {
          this.meetingEndTime = Date.now()
          console.log('⚠️ Meeting may be ending, monitoring...')
        } else if (Date.now() - this.meetingEndTime > 5000) {
          // Stable for 5 seconds, stop recording
          console.log('🤖 Meeting ended - stopping recording')
          this.showNotification('🛑 Auto-recording stopped', 'Meeting ended')
          this.stop()
          this.meetingDetected = false
          this.meetingEndTime = null
          this.participantStableTime = null
        }
      } else {
        // Reset end timer if meeting is active again
        this.meetingEndTime = null
      }

      this.lastParticipantCount = participants
    } catch (error) {
      console.log('Error detecting meeting state:', error)
    }
  }

  showNotification(title, message) {
    try {
      // Create a temporary notification
      const notification = document.createElement('div')
      notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 999999 !important;
        background: hsl(222.2 84% 4.9%) !important;
        color: white !important;
        padding: 12px 20px !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `
      notification.innerHTML = `
        <div style="font-weight: 600 !important; margin-bottom: 4px !important;">${title}</div>
        <div style="font-size: 12px !important; opacity: 0.9 !important;">${message}</div>
      `

      document.body.appendChild(notification)

      // Remove notification after 4 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 4000)
    } catch (error) {
      console.log('Could not show notification:', error)
    }
  }

  getParticipantCount() {
    try {
      // Multiple selectors for participant count
      const selectors = [
        '[data-participant-count]',
        '[jsname="btD6sd"]', // Participant count element
        '.uGOf1d', // Meet participant area
        '[aria-label*="participant"]',
        '[data-call-participants]'
      ]

      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          const text = element.textContent || element.getAttribute('aria-label') || ''
          const match = text.match(/(\d+)/)
          if (match) {
            return parseInt(match[1])
          }
        }
      }

      // Fallback: count visible video elements
      const videoElements = document.querySelectorAll('video').length
      return Math.max(videoElements, 1)
    } catch (error) {
      return 1
    }
  }

  isInActiveMeeting() {
    try {
      // Check for meeting indicators
      const indicators = [
        '[data-call-ended="false"]',
        '[aria-label*="Leave call"]',
        '[aria-label*="End call"]',
        '.VfPpkd-Bz112c-LgbsSe[aria-label*="Leave"]', // Leave button
        '[jsname="CQylAd"]', // Meet controls area
        '.crqnQb' // Meeting controls container
      ]

      return indicators.some(selector => document.querySelector(selector))
    } catch (error) {
      return false
    }
  }

  // Bot service integration methods
  notifyBotRecordingStarted() {
    try {
      const meetingUrl = window.location.href
      const meetingData = {
        meetingTitle: this.nameInput?.value || this.extractMeetingNameFromUI(),
        participants: this.getParticipantCount(),
        timestamp: new Date(),
        recordingType: 'extension'
      }

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'recordingStarted',
        meetingUrl,
        meetingData
      }, (response) => {
        if (response?.success) {
          console.log('✅ Bot service notified - Meeting ID:', response.meetingId)
          this.botMeetingId = response.meetingId
        } else {
          console.log('⚠️ Bot service notification failed:', response?.error || 'Unknown error')
        }
      })
    } catch (error) {
      console.error('❌ Error notifying bot service:', error)
    }
  }

  notifyBotRecordingStopped() {
    try {
      const meetingUrl = window.location.href

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'recordingStopped',
        meetingUrl,
        meetingId: this.botMeetingId
      }, (response) => {
        if (response?.success) {
          console.log('✅ Bot service notified to stop recording')
          this.botMeetingId = null
        } else {
          console.log('⚠️ Bot service stop notification failed:', response?.error || 'Unknown error')
        }
      })
    } catch (error) {
      console.error('❌ Error notifying bot service:', error)
    }
  }

  updateMeetingDataToBot() {
    try {
      if (!this.botMeetingId) return

      const meetingUrl = window.location.href
      const data = {
        meetingTitle: this.nameInput?.value || this.extractMeetingNameFromUI(),
        participants: this.getParticipantCount(),
        timestamp: new Date()
      }

      chrome.runtime.sendMessage({
        action: 'updateMeetingData',
        meetingUrl,
        data
      })
    } catch (error) {
      console.error('❌ Error updating meeting data:', error)
    }
  }

  checkBotStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'checkBotStatus'
      }, (response) => {
        resolve(response?.success ? response.botStatus : null)
      })
    })
  }

  async requestBotRecording() {
    try {
      console.log('🤖 Requesting bot recording...')

      const meetingUrl = window.location.href
      const meetingName = this.nameInput.value || this.extractMeetingNameFromUI() || 'Untitled Meeting'

      this.requestBotBtn.disabled = true
      this.requestBotBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <span>Sending request...</span>
      `

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/bot-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          meetingUrl,
          meetingName,
          requestedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        this.showNotification(
          '✅ Bot Request Sent',
          'Admin will join the meeting shortly'
        )
        this.requestBotBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>Request Sent!</span>
        `

        setTimeout(() => {
          this.requestBotBtn.disabled = false
          this.requestBotBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <circle cx="12" cy="5" r="2"/>
              <path d="M12 7v4"/>
              <line x1="8" y1="16" x2="8" y2="16"/>
              <line x1="16" y1="16" x2="16" y2="16"/>
            </svg>
            <span>Request Bot Recording</span>
          `
        }, 3000)
      } else {
        throw new Error('Failed to send request')
      }

    } catch (error) {
      console.error('❌ Bot request failed:', error)
      this.showNotification(
        '❌ Request Failed',
        'Please try again or contact support'
      )
      this.requestBotBtn.disabled = false
      this.requestBotBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2"/>
          <circle cx="12" cy="5" r="2"/>
          <path d="M12 7v4"/>
          <line x1="8" y1="16" x2="8" y2="16"/>
          <line x1="16" y1="16" x2="16" y2="16"/>
        </svg>
        <span>Request Bot Recording</span>
      `
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + R to start/stop recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        if (this.recording) {
          this.stop()
        } else {
          this.start()
        }
        this.showNotification(
          '⌨️ Keyboard Shortcut',
          this.recording ? 'Recording started' : 'Recording stopped'
        )
      }

      // Ctrl/Cmd + Shift + C to toggle collapse
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        this.toggleCollapse()
      }
    })

    console.log('⌨️ Keyboard shortcuts enabled: Ctrl/Cmd+Shift+R (record), Ctrl/Cmd+Shift+C (collapse)')
  }
}

// Initialize
if (window.location.hostname === 'meet.google.com') {
  console.log('🎥 Starting Professional Recorder')
  window.professionalRecorder = new ProfessionalRecorder()
}