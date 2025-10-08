document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup DOM loaded')

  const openDashboardBtn = document.getElementById('openDashboard')
  const openMeetBtn = document.getElementById('openMeet')
  const statusDiv = document.getElementById('status')
  const statusText = document.getElementById('statusText')

  console.log('Elements found:', {
    openDashboardBtn: !!openDashboardBtn,
    openMeetBtn: !!openMeetBtn,
    statusDiv: !!statusDiv,
    statusText: !!statusText
  })

  // Check if we're on a Google Meet page
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const currentTab = tabs[0]

    if (currentTab.url.includes('meet.google.com')) {
      statusText.textContent = 'On Google Meet - Ready to record'
      statusDiv.className = 'status ready'

      // Try to get recording status from content script
      chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, function(response) {
        if (chrome.runtime.lastError) {
          // Content script not loaded
          statusText.textContent = 'Refresh the page to enable recording'
          statusDiv.className = 'status'
        } else if (response && response.isRecording) {
          statusText.textContent = 'Recording in progress...'
          statusDiv.className = 'status recording'
        }
      })
    } else {
      statusText.textContent = 'Navigate to Google Meet to record'
      statusDiv.className = 'status'
    }
  })

  // Open dashboard
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', function(e) {
      e.preventDefault()
      console.log('Dashboard button clicked')
      chrome.tabs.create({ url: 'http://localhost:3001' })
      window.close()
    })
  } else {
    console.error('Dashboard button not found!')
  }

  // Open Google Meet
  if (openMeetBtn) {
    openMeetBtn.addEventListener('click', function(e) {
      e.preventDefault()
      console.log('Meet button clicked')
      chrome.tabs.create({ url: 'https://meet.google.com' })
      window.close()
    })
  } else {
    console.error('Meet button not found!')
  }

  // Update status periodically if on Meet page
  setInterval(function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const currentTab = tabs[0]

      if (currentTab.url.includes('meet.google.com')) {
        chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' }, function(response) {
          if (!chrome.runtime.lastError && response) {
            if (response.isRecording) {
              statusText.textContent = `Recording... ${response.timer || ''}`
              statusDiv.className = 'status recording'
            } else {
              statusText.textContent = 'Ready to record'
              statusDiv.className = 'status ready'
            }
          }
        })
      }
    })
  }, 1000)
})