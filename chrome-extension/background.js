// Background script for the Chrome extension

const BOT_SERVICE_URL = 'https://logam-portal-production.up.railway.app';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Logam Meet Recorder extension installed')

  // Test bot service connection
  testBotConnection()
})

// Test connection to bot service
async function testBotConnection() {
  try {
    const response = await fetch(`${BOT_SERVICE_URL}/health`)
    if (response.ok) {
      console.log('✅ Bot service connected')
    }
  } catch (error) {
    console.log('ℹ️ Bot service not available:', error.message)
  }
}

// Notify bot service when recording starts
async function notifyBotStartRecording(meetingUrl, tabId, meetingData = {}) {
  try {
    console.log('🤖 Notifying bot service to join meeting:', meetingUrl)

    const response = await fetch(`${BOT_SERVICE_URL}/extension/start-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meetingUrl,
        tabId,
        extensionData: {
          ...meetingData,
          timestamp: new Date(),
          userAgent: navigator.userAgent
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Bot service notified, meeting ID:', result.meetingId)

      // Store meeting ID for later reference
      chrome.storage.local.set({
        [`meeting_${tabId}`]: {
          meetingId: result.meetingId,
          meetingUrl,
          startTime: new Date(),
          botJoined: true
        }
      })

      return result.meetingId
    } else {
      console.error('❌ Failed to notify bot service:', result.error)
    }
  } catch (error) {
    console.error('❌ Error notifying bot service:', error)
  }

  return null
}

// Notify bot service when recording stops
async function notifyBotStopRecording(meetingUrl, tabId) {
  try {
    // Get stored meeting data
    const storage = await chrome.storage.local.get([`meeting_${tabId}`])
    const meetingData = storage[`meeting_${tabId}`]

    if (!meetingData) {
      console.log('⚠️ No meeting data found for tab:', tabId)
      return
    }

    console.log('🤖 Notifying bot service to leave meeting:', meetingUrl)

    const response = await fetch(`${BOT_SERVICE_URL}/extension/stop-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meetingId: meetingData.meetingId,
        meetingUrl,
        tabId
      })
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Bot service notified to stop recording')

      // Clean up storage
      chrome.storage.local.remove([`meeting_${tabId}`])
    } else {
      console.error('❌ Failed to notify bot service:', result.error)
    }
  } catch (error) {
    console.error('❌ Error notifying bot service:', error)
  }
}

// Send meeting data to bot service
async function sendMeetingDataToBot(meetingUrl, tabId, data) {
  try {
    await fetch(`${BOT_SERVICE_URL}/extension/meeting-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meetingUrl,
        tabId,
        ...data
      })
    })
  } catch (error) {
    console.error('❌ Error sending meeting data to bot:', error)
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRecordingPermission') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], tabs[0], (streamId) => {
        sendResponse({ streamId })
      })
    })
    return true // Will respond asynchronously
  }

  if (request.action === 'getStreamId') {
    // Automatically select the current tab for recording
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0]

      // Use desktopCapture to get tab media without showing picker
      chrome.desktopCapture.chooseDesktopMedia(
        ['tab'], // Only allow tab selection
        currentTab,
        (streamId) => {
          if (streamId) {
            console.log('Stream ID obtained:', streamId)
            sendResponse({ streamId: streamId })
          } else {
            console.error('Failed to get stream ID:', chrome.runtime.lastError)
            sendResponse({ error: chrome.runtime.lastError?.message })
          }
        }
      )
    })
    return true // Will respond asynchronously
  }

  if (request.action === 'captureTabAudio') {
    // Capture current tab audio for real-time transcription
    chrome.tabCapture.capture({
      audio: true,
      video: false
    }, (stream) => {
      if (chrome.runtime.lastError) {
        console.error('Tab capture error:', chrome.runtime.lastError)
        sendResponse({ error: chrome.runtime.lastError.message })
      } else if (stream) {
        console.log('✅ Tab audio captured successfully for transcription')
        sendResponse({ success: true })

        // Forward the stream to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'receiveAudioStream',
            stream: stream
          })
        })
      } else {
        console.error('❌ No audio stream available')
        sendResponse({ error: 'No audio stream available' })
      }
    })
    return true // Will respond asynchronously
  }

  // Handle recording start notification
  if (request.action === 'recordingStarted') {
    const { meetingUrl, meetingData } = request
    const tabId = sender.tab.id

    // Notify bot service to join meeting
    notifyBotStartRecording(meetingUrl, tabId, meetingData)
      .then(meetingId => {
        sendResponse({ success: true, meetingId })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })

    return true // Will respond asynchronously
  }

  // Handle recording stop notification
  if (request.action === 'recordingStopped') {
    const { meetingUrl } = request
    const tabId = sender.tab.id

    // Notify bot service to leave meeting
    notifyBotStopRecording(meetingUrl, tabId)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })

    return true // Will respond asynchronously
  }

  // Handle meeting data updates
  if (request.action === 'updateMeetingData') {
    const { meetingUrl, data } = request
    const tabId = sender.tab.id

    // Send meeting data to bot service
    sendMeetingDataToBot(meetingUrl, tabId, data)
    sendResponse({ success: true })
  }

  // Check bot service status
  if (request.action === 'checkBotStatus') {
    fetch(`${BOT_SERVICE_URL}/extension/status`)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, botStatus: data })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })

    return true // Will respond asynchronously
  }
})

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('meet.google.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggleRecording' })
  } else {
    chrome.tabs.create({ url: 'https://logam-portal-production.up.railway.app' })
  }
})