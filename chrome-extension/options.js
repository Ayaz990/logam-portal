// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl')

  // Load saved API URL
  const result = await chrome.storage.sync.get(['apiUrl'])
  if (result.apiUrl) {
    apiUrlInput.value = result.apiUrl
  } else {
    // Default to localhost for development
    apiUrlInput.value = 'http://localhost:3001'
  }
})

// Save settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault()

  const apiUrl = document.getElementById('apiUrl').value.trim()
  const statusDiv = document.getElementById('status')

  // Remove trailing slash if present
  const cleanUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl

  // Validate URL
  try {
    new URL(cleanUrl)
  } catch (err) {
    statusDiv.textContent = '❌ Invalid URL. Please enter a valid URL (e.g., https://example.com)'
    statusDiv.className = 'status error'
    statusDiv.style.display = 'block'
    return
  }

  // Save to Chrome storage
  await chrome.storage.sync.set({ apiUrl: cleanUrl })

  statusDiv.textContent = '✅ Settings saved successfully!'
  statusDiv.className = 'status success'
  statusDiv.style.display = 'block'

  // Hide status after 3 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none'
  }, 3000)
})
