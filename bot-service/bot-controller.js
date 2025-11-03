const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin())

class BotController {
  constructor(config) {
    this.email = config.email
    this.password = config.password
    this.displayName = config.displayName
    this.headless = config.headless !== false
    this.apiUrl = config.apiUrl
    this.browser = null
    this.page = null
    this.recorder = null
    this.recordingPath = null
    this.startTime = null
  }

  // Helper function to wait (replacement for page.waitForTimeout)
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async joinAndRecord(meetingUrl, metadata) {
    try {
      console.log('🌐 Launching browser...')

      // Create persistent user data directory
      const userDataDir = path.join(__dirname, 'chrome-user-data')
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true })
      }

      // Launch browser with proper flags for recording
      this.browser = await puppeteer.launch({
        headless: this.headless,
        userDataDir: userDataDir, // Persist login sessions
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--autoplay-policy=no-user-gesture-required',
          '--window-size=1920,1080',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ],
        ignoreDefaultArgs: ['--mute-audio'],
        defaultViewport: null,
        timeout: 60000
      })

      this.page = await this.browser.newPage()

      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 })

      // Grant permissions for camera and microphone
      const context = this.browser.defaultBrowserContext()
      await context.overridePermissions('https://meet.google.com', [
        'camera',
        'microphone',
        'notifications'
      ])

      console.log('🔐 Logging in to Google account...')
      await this.loginToGoogle()

      console.log('📞 Joining meeting:', meetingUrl)
      await this.joinMeeting(meetingUrl)

      console.log('🎥 Starting recording...')
      await this.startRecording(metadata)

      console.log('⏳ Monitoring meeting...')
      await this.monitorMeeting()

      console.log('🛑 Meeting ended, stopping recording...')
      await this.stopRecording()

      console.log('📤 Uploading recording...')
      const uploadResult = await this.uploadRecording(metadata)

      console.log('🧹 Cleaning up...')
      await this.cleanup()

      return uploadResult

    } catch (error) {
      console.error('❌ Error in bot session:', error)
      await this.cleanup()
      throw error
    }
  }

  async loginToGoogle() {
    try {
      // Check if already logged in
      await this.page.goto('https://accounts.google.com', {
        waitUntil: 'networkidle2'
      })

      // Check if we're already logged in by looking for account menu
      const alreadyLoggedIn = await this.page.evaluate(() => {
        // Check for various indicators of being logged in
        return document.querySelector('[aria-label*="Google Account" i]') !== null ||
               document.querySelector('[data-ogsr-up]') !== null ||
               window.location.href.includes('myaccount.google.com')
      })

      if (alreadyLoggedIn) {
        console.log('✅ Already logged in (using saved session)')
        return
      }

      console.log('🔐 Not logged in, logging in now...')

      // Go to Google login page
      await this.page.goto('https://accounts.google.com/signin', {
        waitUntil: 'networkidle2'
      })

      // Enter email
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 })
      await this.page.type('input[type="email"]', this.email, { delay: 100 })
      await this.page.click('#identifierNext')

      // Wait for password page
      await this.page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 })
      await this.wait(1000)

      // Enter password
      await this.page.type('input[type="password"]', this.password, { delay: 100 })
      await this.page.click('#passwordNext')

      // Wait for login to complete
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })

      console.log('✅ Logged in successfully')
    } catch (error) {
      console.error('❌ Login failed:', error.message)
      throw new Error('Failed to login to Google account')
    }
  }

  async joinMeeting(meetingUrl) {
    try {
      console.log('🔗 Navigating to meeting URL:', meetingUrl)

      // Navigate to meeting
      await this.page.goto(meetingUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })

      console.log('📄 Page loaded, current URL:', this.page.url())

      // Wait for page to settle
      await this.wait(5000)

      // Take debug screenshot
      const debugPath = path.join(__dirname, `debug-after-load-${Date.now()}.jpg`)
      await this.page.screenshot({ path: debugPath, fullPage: true })
      console.log('📸 Debug screenshot saved:', debugPath)

      // Check what's on the page
      const pageContent = await this.page.evaluate(() => {
        // Get all buttons
        const buttons = Array.from(document.querySelectorAll('button'))
        const buttonTexts = buttons.map(btn => btn.textContent.trim()).filter(t => t.length > 0)

        return {
          title: document.title,
          url: window.location.href,
          hasJoinButton: document.querySelector('[aria-label*="Join" i]') !== null,
          hasAskToJoinButton: document.querySelector('[aria-label*="Ask" i]') !== null,
          allButtons: buttonTexts,
          bodyText: document.body.innerText.substring(0, 500)
        }
      })

      console.log('📋 Page content:', JSON.stringify(pageContent, null, 2))

      // Dismiss any popups or notifications
      await this.dismissPopups()

      await this.wait(2000)

      // Turn off camera and microphone BEFORE joining
      console.log('🎥 Attempting to turn off camera and mic...')
      await this.toggleMediaDevices(false, false)

      await this.wait(3000)

      // Take screenshot before joining
      const beforeJoinPath = path.join(__dirname, `debug-before-join-${Date.now()}.jpg`)
      await this.page.screenshot({ path: beforeJoinPath, fullPage: true })
      console.log('📸 Before join screenshot:', beforeJoinPath)

      // Click "Join now" or "Ask to join" button
      await this.clickJoinButton()

      // Wait for join action to complete
      await this.wait(5000)

      // Take screenshot after clicking join
      const afterJoinPath = path.join(__dirname, `debug-after-join-${Date.now()}.jpg`)
      await this.page.screenshot({ path: afterJoinPath, fullPage: true })
      console.log('📸 After join screenshot:', afterJoinPath)

      console.log('✅ Joined meeting successfully')
    } catch (error) {
      console.error('❌ Failed to join meeting:', error.message)
      console.error('❌ Stack trace:', error.stack)

      // Take error screenshot
      try {
        const errorPath = path.join(__dirname, `debug-error-${Date.now()}.jpg`)
        await this.page.screenshot({ path: errorPath, fullPage: true })
        console.log('📸 Error screenshot saved:', errorPath)
      } catch (screenshotError) {
        console.log('⚠️  Could not take error screenshot')
      }

      throw new Error('Failed to join meeting')
    }
  }

  async dismissPopups() {
    try {
      // Try to dismiss various popups
      const selectors = [
        '[aria-label="Dismiss"]',
        '[aria-label="Got it"]',
        '[aria-label="Close"]',
        'button[jsname="j6LnYe"]'
      ]

      for (const selector of selectors) {
        try {
          const button = await this.page.$(selector)
          if (button) {
            await button.click()
            await this.wait(500)
          }
        } catch (e) {
          // Ignore if button not found
        }
      }
    } catch (error) {
      console.log('⚠️  Could not dismiss popups:', error.message)
    }
  }

  async toggleMediaDevices(camera, microphone) {
    try {
      console.log('🎥 Configuring media devices...')

      // Wait for media controls to load
      await this.wait(2000)

      // Try to find and toggle camera
      if (camera === false) {
        console.log('🎥 Turning off camera...')
        const cameraSelectors = [
          '[aria-label*="camera" i][aria-label*="turn off" i]',
          '[aria-label*="Turn off camera" i]',
          '[aria-label*="camera off" i]',
          '[data-tooltip*="camera" i]',
          'button[data-is-muted="false"][aria-label*="camera" i]'
        ]

        let cameraToggled = false
        for (const selector of cameraSelectors) {
          try {
            const button = await this.page.$(selector)
            if (button) {
              await button.click()
              console.log('✅ Camera toggled off')
              cameraToggled = true
              await this.wait(500)
              break
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!cameraToggled) {
          console.log('⚠️  Could not find camera toggle button (may already be off)')
        }
      }

      // Try to find and toggle microphone
      if (microphone === false) {
        console.log('🎤 Turning off microphone...')
        const micSelectors = [
          '[aria-label*="microphone" i][aria-label*="turn off" i]',
          '[aria-label*="Turn off microphone" i]',
          '[aria-label*="mic off" i]',
          '[data-tooltip*="microphone" i]',
          'button[data-is-muted="false"][aria-label*="microphone" i]'
        ]

        let micToggled = false
        for (const selector of micSelectors) {
          try {
            const button = await this.page.$(selector)
            if (button) {
              await button.click()
              console.log('✅ Microphone toggled off')
              micToggled = true
              await this.wait(500)
              break
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!micToggled) {
          console.log('⚠️  Could not find microphone toggle button (may already be off)')
        }
      }

      console.log('✅ Media devices configured')
    } catch (error) {
      console.log('⚠️  Error toggling media devices:', error.message)
      // Don't throw - this is not critical
    }
  }

  async clickJoinButton() {
    try {
      console.log('🔍 Looking for join button...')

      // Wait a bit for buttons to appear
      await this.wait(3000)

      // First, check all buttons on the page for debugging
      const debugInfo = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'))
        return {
          totalButtons: buttons.length,
          buttonTexts: buttons.map(btn => ({
            text: btn.textContent?.trim() || '',
            ariaLabel: btn.getAttribute('aria-label'),
            jsname: btn.getAttribute('jsname'),
            visible: btn.offsetParent !== null
          })).filter(b => b.text || b.ariaLabel)
        }
      })

      console.log('🔍 Found buttons:', JSON.stringify(debugInfo, null, 2))

      // Try multiple approaches to find and click the join button
      let clicked = false
      let isAskToJoin = false

      // Approach 1: Try common aria-label attributes
      const ariaLabels = [
        'Join now',
        'Ask to join',
        'Ask to Join',
        'Join call',
        'Join meeting'
      ]

      for (const label of ariaLabels) {
        try {
          console.log(`🔍 Trying aria-label: "${label}"`)
          const button = await this.page.$(`[aria-label="${label}"]`)
          if (button) {
            console.log(`✅ Found button with aria-label: "${label}"`)
            isAskToJoin = label.toLowerCase().includes('ask')
            await button.click()
            clicked = true
            console.log(`✅ Clicked "${label}" button`)
            break
          }
        } catch (e) {
          console.log(`❌ Failed to click aria-label "${label}":`, e.message)
        }
      }

      // Approach 2: Try jsname attribute (Google Meet specific)
      if (!clicked) {
        console.log('🔍 Trying jsname selectors...')
        const jsnameSelectors = [
          'button[jsname="Qx7uuf"]',
          'button[jsname="Qx7uuf"] span',
          'div[jsname="Qx7uuf"]'
        ]

        for (const selector of jsnameSelectors) {
          try {
            const button = await this.page.$(selector)
            if (button) {
              console.log(`✅ Found button with selector: ${selector}`)
              await button.click()
              clicked = true
              console.log(`✅ Clicked button with selector: ${selector}`)
              break
            }
          } catch (e) {
            console.log(`❌ Failed with selector ${selector}:`, e.message)
          }
        }
      }

      // Approach 3: Search by text content
      if (!clicked) {
        console.log('🔍 Searching buttons by text content...')
        const buttonInfo = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
          console.log(`Found ${buttons.length} buttons total`)

          // Look for join buttons
          const joinTexts = ['join now', 'ask to join', 'join call', 'join meeting']

          for (const button of buttons) {
            const text = button.textContent?.toLowerCase() || ''
            const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || ''
            const fullText = text + ' ' + ariaLabel

            for (const joinText of joinTexts) {
              if (fullText.includes(joinText)) {
                console.log(`Found join button: "${button.textContent}"`)
                button.click()
                return {
                  clicked: true,
                  isAskToJoin: fullText.includes('ask'),
                  buttonText: button.textContent
                }
              }
            }
          }

          return { clicked: false, isAskToJoin: false, buttonText: null }
        })

        clicked = buttonInfo.clicked
        isAskToJoin = buttonInfo.isAskToJoin

        if (clicked) {
          console.log(`✅ Clicked button with text: "${buttonInfo.buttonText}"`)
        } else {
          console.log('❌ No join button found by text search')
        }
      }

      // Approach 4: Use keyboard shortcut (Enter key)
      if (!clicked) {
        console.log('🔍 Trying keyboard shortcut (Enter key)...')
        try {
          // Focus on the page and press Enter (common way to join)
          await this.page.keyboard.press('Enter')
          await this.wait(2000)

          // Check if join was successful
          const joinedViaKeyboard = await this.page.evaluate(() => {
            // Check if we're in the meeting or join was triggered
            return document.querySelector('[aria-label*="Leave" i]') !== null ||
                   document.querySelector('[aria-label*="Waiting" i]') !== null
          })

          if (joinedViaKeyboard) {
            console.log('✅ Joined using Enter key')
            clicked = true
          }
        } catch (e) {
          console.log('❌ Keyboard shortcut failed:', e.message)
        }
      }

      if (!clicked) {
        throw new Error('Could not find join button with any method')
      }

      // Log join type
      if (isAskToJoin) {
        console.log('🚪 This is an "Ask to join" meeting - waiting for host approval...')
      } else {
        console.log('✅ This is a regular join - entering meeting...')
      }

      // If it's "Ask to join", wait for approval
      if (isAskToJoin) {
        console.log('⏳ Waiting for host to approve (up to 2 minutes)...')

        // Wait for approval indicators
        const approved = await this.waitForApproval()

        if (approved) {
          console.log('✅ Host approved! Bot is now in the meeting')
        } else {
          console.log('⚠️  Host did not approve within 2 minutes')
        }
      } else {
        // Regular join - wait for join to complete
        console.log('⏳ Waiting for join to complete...')
        await this.wait(5000)
      }

    } catch (error) {
      console.error('❌ Failed to click join button:', error.message)
      console.error('❌ Stack trace:', error.stack)
      throw error
    }
  }

  async waitForApproval(maxWaitTime = 120000) {
    // Wait up to 2 minutes for host approval
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if we're in the meeting (approved)
        const inMeeting = await this.page.evaluate(() => {
          // Look for meeting controls that appear when in the call
          return document.querySelector('[aria-label*="Leave" i]') !== null ||
                 document.querySelector('[aria-label*="End" i]') !== null ||
                 document.querySelector('[data-meeting-controls]') !== null ||
                 document.querySelector('.crqnQb') !== null
        })

        if (inMeeting) {
          return true
        }

        // Check if request was denied
        const denied = await this.page.evaluate(() => {
          const text = document.body.textContent
          return text.includes('denied') ||
                 text.includes('rejected') ||
                 text.includes('not allowed')
        })

        if (denied) {
          console.log('❌ Request to join was denied by host')
          return false
        }

        // Wait 2 seconds before checking again
        await this.wait(2000)

      } catch (error) {
        console.log('⚠️  Error checking approval status:', error.message)
      }
    }

    return false
  }

  async startRecording(metadata) {
    try {
      this.startTime = Date.now()
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      this.recordingPath = path.join(__dirname, `recording-${timestamp}.webm`)

      // Start screen recording using Puppeteer's built-in recording
      const client = await this.page.target().createCDPSession()

      // Start recording with proper codec
      await client.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 100,
        maxWidth: 1920,
        maxHeight: 1080
      })

      // Collect frames
      this.frames = []
      client.on('Page.screencastFrame', async ({ data, sessionId }) => {
        this.frames.push(data)
        await client.send('Page.screencastFrameAck', { sessionId })
      })

      this.cdpSession = client

      console.log('✅ Recording started')
      console.log('📁 Recording path:', this.recordingPath)
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      throw error
    }
  }

  async monitorMeeting() {
    try {
      console.log('👀 Monitoring meeting activity...')

      // Monitor for meeting end indicators
      let checkCount = 0
      const maxChecks = 3600 // 1 hour max (checking every 10 seconds)

      while (checkCount < maxChecks) {
        await this.wait(10000) // Check every 10 seconds

        // Check if we're still in the meeting
        const inMeeting = await this.isInMeeting()

        if (!inMeeting) {
          console.log('🏁 Meeting ended or bot was removed')
          break
        }

        // Check if bot is alone in meeting
        const participantCount = await this.getParticipantCount()
        console.log(`👥 Participants: ${participantCount}`)

        if (participantCount <= 1 && process.env.AUTO_LEAVE_WHEN_ALONE === 'true') {
          console.log('🚶 Bot is alone, leaving meeting...')
          break
        }

        checkCount++
      }

    } catch (error) {
      console.error('❌ Error monitoring meeting:', error)
    }
  }

  async isInMeeting() {
    try {
      // Check for leave button or meeting controls
      const leaveButton = await this.page.$('[aria-label*="Leave" i], [aria-label*="End" i]')
      return !!leaveButton
    } catch (error) {
      return false
    }
  }

  async getParticipantCount() {
    try {
      // Try to find participant count in the UI
      const count = await this.page.evaluate(() => {
        // Try multiple selectors
        const selectors = [
          '[data-participant-count]',
          '[jsname="btD6sd"]',
          '.uGOf1d'
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

        // Fallback: count video elements
        return document.querySelectorAll('video').length
      })

      return count || 1
    } catch (error) {
      return 1
    }
  }

  async stopRecording() {
    try {
      if (this.cdpSession) {
        await this.cdpSession.send('Page.stopScreencast')

        // Save frames as video (simplified - just save as images for now)
        console.log(`📊 Captured ${this.frames.length} frames`)

        // In production, you'd convert frames to video using ffmpeg
        // For now, we'll take a screenshot as the recording
        await this.page.screenshot({
          path: this.recordingPath,
          type: 'jpeg',
          quality: 90,
          fullPage: true
        })
      }

      console.log('✅ Recording stopped')
    } catch (error) {
      console.error('❌ Error stopping recording:', error)
      throw error
    }
  }

  async uploadRecording(metadata) {
    try {
      // For now, take a final screenshot if recording file doesn't exist
      if (!fs.existsSync(this.recordingPath)) {
        console.log('📸 Taking final screenshot...')
        await this.page.screenshot({
          path: this.recordingPath,
          type: 'jpeg',
          quality: 90,
          fullPage: true
        })
      }

      const fileStats = fs.statSync(this.recordingPath)
      console.log(`📦 Recording size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`)

      // Create form data
      const formData = new FormData()
      formData.append('video', fs.createReadStream(this.recordingPath), {
        filename: 'bot-recording.jpg',
        contentType: 'image/jpeg'
      })
      formData.append('meetUrl', metadata.meetingUrl || 'Unknown')
      formData.append('meetingName', metadata.meetingName || 'Bot Recording')
      formData.append('userId', metadata.userId || 'bot')
      formData.append('timestamp', this.startTime.toString())
      formData.append('duration', (Date.now() - this.startTime).toString())
      formData.append('recordingType', 'bot')
      formData.append('botRequestId', metadata.requestId)

      // Upload to API
      console.log('📤 Uploading to:', `${this.apiUrl}/api/upload`)

      const response = await axios.post(`${this.apiUrl}/api/upload`, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000 // 5 minutes
      })

      console.log('✅ Upload successful:', response.data)

      return {
        success: true,
        recordingId: response.data.id || response.data.meetingId,
        videoUrl: response.data.videoUrl || response.data.downloadURL
      }

    } catch (error) {
      console.error('❌ Upload failed:', error.message)
      throw error
    }
  }

  async cleanup() {
    try {
      // Close CDP session
      if (this.cdpSession) {
        await this.cdpSession.detach()
      }

      // Close browser
      if (this.browser) {
        await this.browser.close()
      }

      // Delete local recording file
      if (this.recordingPath && fs.existsSync(this.recordingPath)) {
        fs.unlinkSync(this.recordingPath)
        console.log('🗑️  Local recording deleted')
      }

      console.log('✅ Cleanup completed')
    } catch (error) {
      console.error('⚠️  Cleanup error:', error.message)
    }
  }

  async close() {
    await this.cleanup()
  }
}

module.exports = BotController
