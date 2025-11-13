# Logam Transcription Service - Railway Deployment

This is a standalone WebSocket server for real-time transcription using Groq Whisper API.

## Why Separate Service?

Railway only exposes ONE port per service. Your main app uses that port for Next.js, so the transcription WebSocket needs its own service.

## Quick Deployment to Railway

### Step 1: Push to GitHub

```bash
cd /Users/developerlogam/Documents/logam-meet
git add transcription-service/
git commit -m "Add transcription service for Railway deployment"
git push
```

### Step 2: Create New Railway Service

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will detect the project

### Step 3: Configure Service

1. In Railway dashboard, click **"Settings"**
2. Under **"Service"**, set:
   - **Name:** `logam-transcription`
   - **Root Directory:** `transcription-service`
3. Under **"Deploy"**, set:
   - **Start Command:** `npm start`
4. Click **"Save"**

### Step 4: Add Environment Variables

1. Click **"Variables"** tab
2. Add this variable:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
3. Railway will automatically redeploy (~2 minutes)

### Step 5: Get Your Service URL

After deployment completes:
1. Railway shows your URL like: `https://logam-transcription-production.up.railway.app`
2. **Copy this URL** - you'll need it for the extension

### Step 6: Update Chrome Extension

1. Open `chrome-extension/recorder-ui.js`
2. Find line 1003:
   ```javascript
   const PRODUCTION_WS_URL = 'wss://YOUR-TRANSCRIPTION-SERVICE.up.railway.app'
   ```
3. Replace with your actual URL:
   ```javascript
   const PRODUCTION_WS_URL = 'wss://logam-transcription-production.up.railway.app'
   ```
4. Save the file

### Step 7: Rebuild Extension

```bash
cd chrome-extension
zip -r ../logam-meet-extension.zip *
```

### Step 8: Reload Extension in Chrome

1. Open Chrome → Extensions (`chrome://extensions`)
2. Find "Logam Meet Recorder"
3. Click reload icon (circular arrow)
4. Done!

## Testing Transcription

1. Join a Google Meet meeting
2. Click the recorder
3. Click "Start Recording"
4. Enable "Live Transcription" toggle
5. Speak into microphone
6. You should see transcription appear in real-time!

## Cost

- **Main app:** ~$7-10/month (existing)
- **Transcription service:** ~$3-5/month (new)
- **Total:** ~$10-15/month

## Troubleshooting

### "WebSocket connection failed"

**Check:**
1. Railway service is deployed and running
2. GROQ_API_KEY is set in Railway variables
3. Extension URL matches Railway URL (check wss:// not ws://)

### "Transcription not appearing"

**Check:**
1. Live transcription toggle is ON in recorder
2. Browser console for WebSocket errors (F12 → Console)
3. Railway logs for transcription server errors

### "Connection timeout"

**Check:**
1. Railway service is online (not paused)
2. URL in extension is correct (no typos)
3. Using `wss://` (secure WebSocket) not `ws://`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key for Whisper transcription |
| `PORT` | No | Railway sets this automatically |

## How It Works

1. Chrome extension captures meeting audio
2. Sends audio chunks to WebSocket server via `wss://`
3. Server transcribes using Groq Whisper API
4. Server sends transcript back to extension
5. Extension displays real-time transcript in UI

## Alternative: Oracle Cloud (FREE)

If you don't want to pay for transcription service, you can deploy to Oracle Cloud for free:

1. Follow `ORACLE_CLOUD_SETUP.md` in the main directory
2. Deploy this transcription service instead of the bot
3. Get public IP from Oracle (e.g., `132.145.XXX.XXX`)
4. Update extension URL to: `ws://132.145.XXX.XXX:8080`
5. **Note:** Use `ws://` not `wss://` for Oracle (unless you set up SSL)

## Files in This Service

- `server.js` - WebSocket server with Groq Whisper integration
- `package.json` - Dependencies (ws, axios, form-data)
- `README.md` - This file

## Need Help?

Check Railway logs:
1. Go to Railway dashboard
2. Click your transcription service
3. Click "Deployments"
4. Click latest deployment
5. View logs for errors

---

**Remember:** You need BOTH services running:
1. Main app: `logam-portal-production.up.railway.app` (Next.js + Dashboard)
2. Transcription: `logam-transcription-production.up.railway.app` (WebSocket server)
