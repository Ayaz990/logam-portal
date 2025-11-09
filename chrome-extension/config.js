// Centralized API configuration
const DEFAULT_API_URL = 'https://logam-portal.vercel.app' // Production URL

async function getApiUrl() {
  // Check if user has configured a custom URL in settings
  try {
    const result = await chrome.storage.sync.get(['apiUrl'])
    return result.apiUrl || DEFAULT_API_URL
  } catch (err) {
    console.warn('Failed to load API URL from storage, using default:', err)
    return DEFAULT_API_URL
  }
}
