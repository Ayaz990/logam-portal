# Transcription Fix - Production Issue Resolved

## Problems Fixed

### Issue 1: Localhost URLs in Production
Transcription was failing because API routes were hardcoded to call `localhost:3001` URLs via `process.env.NEXTAUTH_URL`.

**Root Cause:**
- `upload.js:148` - calling trigger-transcribe at localhost
- `trigger-transcribe.js:58` - calling transcribe at localhost
- `transcribe.js:653` - calling summarize at localhost
- `transcribe-multilingual.js:294` - calling summarize at localhost

### Issue 2: Authentication Blocking Internal Calls
The `trigger-transcribe` endpoint was rejecting all auto-transcript requests because it required user authentication, but `upload.js` was calling it from a background job without credentials.

**Error:** `401 Not authenticated` when calling `/api/trigger-transcribe` from upload

## Solutions

### Solution 1: Dynamic Base URL
Created `lib/getBaseUrl.js` helper function that:
1. Uses `VERCEL_URL` in production (automatically set by Vercel)
2. Falls back to `NEXTAUTH_URL` in development
3. Default fallback to `localhost:3001`

### Solution 2: Internal API Authentication
Added internal API key authentication to allow server-to-server calls:
1. Added `x-internal-api-key` header check in `trigger-transcribe.js`
2. Uses `NEXTAUTH_SECRET` for internal authentication
3. Skips user session check for internal calls
4. Still requires user authentication for manual transcribe requests

## Files Changed
- ✅ `lib/getBaseUrl.js` - New helper function
- ✅ `pages/api/upload.js` - Updated to use getBaseUrl()
- ✅ `pages/api/trigger-transcribe.js` - Updated to use getBaseUrl()
- ✅ `pages/api/transcribe.js` - Updated to use getBaseUrl()
- ✅ `pages/api/transcribe-multilingual.js` - Updated to use getBaseUrl()

## Deployment Instructions

### 1. Commit and push these changes
```bash
git add .
git commit -m "Fix: Use dynamic base URL for production transcription"
git push
```

### 2. Verify Vercel Environment Variables
Make sure these are set in your Vercel dashboard:
- `GROQ_API_KEY` - Your Groq API key
- `USE_GROQ=true` - To use Groq Whisper API
- `AUTO_TRANSCRIPT=true` - To enable auto-transcription
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase credentials

### 3. Deploy to Vercel
The changes will automatically deploy when you push to main branch.

### 4. Test Production Transcription
1. Upload a recording via your Chrome extension
2. Check Vercel logs: `vercel logs --follow`
3. Verify the transcript appears in your dashboard

## Technical Details

### Fix 1: Dynamic URLs

**Before (broken in production):**
```javascript
fetch(`${process.env.NEXTAUTH_URL}/api/trigger-transcribe`, ...)
// Called http://localhost:3001/api/trigger-transcribe in production ❌
```

**After (works everywhere):**
```javascript
fetch(`${getBaseUrl()}/api/trigger-transcribe`, ...)
// In production: https://your-app.vercel.app/api/trigger-transcribe ✅
// In development: http://localhost:3001/api/trigger-transcribe ✅
```

### Fix 2: Internal API Authentication

**Before (authentication blocked):**
```javascript
// trigger-transcribe.js
const session = await getServerSession(req, res, authOptions)
if (!session) {
  return res.status(401).json({ error: 'Not authenticated' }) // ❌ Always blocked
}
```

**After (allows internal calls):**
```javascript
// upload.js - sends internal API key
fetch(url, {
  headers: {
    'x-internal-api-key': process.env.NEXTAUTH_SECRET
  }
})

// trigger-transcribe.js - checks for internal key
const isInternalCall = req.headers['x-internal-api-key'] === process.env.NEXTAUTH_SECRET
if (!isInternalCall) {
  // Only check session for external calls
  const session = await getServerSession(req, res, authOptions)
  if (!session) return res.status(401).json({ error: 'Not authenticated' })
}
// ✅ Internal calls bypass authentication
```

## Monitoring

Check transcription status in logs with these key messages:

### Successful Flow:
1. Upload: `📤 Calling trigger-transcribe for meeting: <ID>`
2. Trigger received: `🔔 Trigger-transcribe called { isInternalCall: true }`
3. Auth success: `✅ Internal API call authenticated`
4. Request: `🎤 Transcribe request for meeting: <ID>`
5. Download: `📥 Downloading video from: <URL>`
6. Transcribe: `🎙️ Sending audio to Groq Whisper API...`
7. Complete: `✅ Transcript saved to Firebase successfully`

### Common Errors:
- `❌ Auto-transcript failed (401): Not authenticated` - Internal API key not working
- `❌ Authentication failed - no session` - Manual transcribe without login
- `❌ Transcribe API failed` - Groq API issue
- `❌ Auto-transcript error` - Network or configuration issue

Any errors will show with ❌ emoji in the logs.
