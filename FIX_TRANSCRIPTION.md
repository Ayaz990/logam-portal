# Fix Transcription Not Generating

## Issue
Video uploads successfully, but transcription and summary are not generating automatically.

## Root Cause
The `AUTO_TRANSCRIPT` environment variable is **not set in Vercel production**.

---

## Solution: Set Environment Variables in Vercel

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your project: **logam-portal**
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Variables
Add these environment variables if they're missing:

```
AUTO_TRANSCRIPT=true
USE_GROQ=true
GROQ_API_KEY=your-groq-api-key-here
VERCEL_AUTOMATION_BYPASS_SECRET=your-bypass-secret-here
```

**Note:** Get the actual values from your local `.env` file.

**Important:** Make sure to select **Production** environment for each variable!

### Step 3: Redeploy
After adding variables:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"Redeploy"** button
4. Wait 2 minutes for deployment to complete

---

## Quick Test

### Option 1: Upload New Video
1. Record a new meeting in Google Meet
2. Stop recording
3. Wait 1-2 minutes
4. Check Vercel logs: https://vercel.com/dashboard → Functions
5. Should see: "🎤 Triggering transcript generation..."

### Option 2: Manual Trigger (for existing videos)
Use the manual trigger endpoint I'll create below to force transcription for videos that already uploaded.

---

## Verification

Check Vercel Function Logs for this flow:

✅ **Successful Flow:**
```
💾 Saving meeting metadata (file already in Firebase)...
✅ Meeting saved with ID: <ID>
🎤 Triggering transcript generation...
📤 Calling trigger-transcribe for meeting: <ID>
🔗 Base URL: https://logam-portal.vercel.app
✅ Transcript generation started

🔔 Trigger-transcribe called { isInternalCall: true }
✅ Internal API call authenticated
📥 Downloading video from: <URL>
🎙️ Sending audio to Groq Whisper API...
✅ Transcript saved to Firebase successfully
```

❌ **If you see this (problem):**
```
💾 Saving meeting metadata...
✅ Meeting saved with ID: <ID>
(nothing about transcription - means AUTO_TRANSCRIPT is false or missing)
```

---

## Alternative: Manual Transcription Trigger

If you have videos that already uploaded but didn't get transcription, use this endpoint:

### Trigger Single Meeting
Open your browser console on the dashboard and run:

```javascript
fetch('/api/manual-transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ meetingId: 'YOUR_MEETING_ID_HERE' })
})
.then(r => r.json())
.then(data => console.log('Result:', data))
```

### Trigger ALL Meetings Without Transcripts
```javascript
fetch('/api/manual-transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcribeAll: true })
})
.then(r => r.json())
.then(data => console.log('Result:', data))
```

This will:
1. Find all your meetings without transcripts
2. Trigger transcription for each one
3. Return status of each meeting

**Note:** You must be logged in to use this endpoint!
