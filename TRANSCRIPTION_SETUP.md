# Real-Time Transcription Setup

This document explains how to set up and use real-time transcription for your meeting recordings.

## Overview

The real-time transcription system uses:
- **WebSocket Server**: Standalone server running on port 8080
- **Groq Whisper API**: Free, fast speech-to-text transcription
- **Chrome Extension**: Sends audio chunks during recording
- **Dashboard**: Displays transcript results

## Prerequisites

1. **Groq API Key**: Get a free API key from [Groq Console](https://console.groq.com/)
2. **Node.js**: Version 18+ required
3. **Environment Variables**: Add to `.env.local`

## Environment Variables

Add these to your `.env.local` file:

```bash
# Groq API for real-time transcription
GROQ_API_KEY=your_groq_api_key_here
USE_GROQ=true

# WebSocket server port (optional, defaults to 8080)
WS_PORT=8080
```

## Running the Transcription Server

### Option 1: Run Everything Together (Recommended for Development)

```bash
npm run dev:all
```

This runs both the Next.js server (port 3001) and the WebSocket transcription server (port 8080) concurrently.

### Option 2: Run Servers Separately

Terminal 1 - Next.js Server:
```bash
npm run dev
```

Terminal 2 - Transcription Server:
```bash
npm run dev:transcription
```

### Option 3: Production Deployment

For production, you'll need to:

1. **Deploy Next.js app** to Vercel/similar
2. **Deploy WebSocket server** separately to:
   - AWS EC2 / DigitalOcean / Heroku
   - Docker container
   - Any Node.js hosting with WebSocket support

Production command:
```bash
npm run start:transcription
```

## How It Works

1. **User starts recording** in Chrome extension
2. **Extension connects** to WebSocket server at `ws://localhost:8080`
3. **Audio chunks sent** every 1 second to the server
4. **Server transcribes** using Groq Whisper API
5. **Transcripts streamed** back to extension in real-time
6. **Results displayed** in the recorder UI

## Troubleshooting

### Transcription Not Working

1. **Check if WebSocket server is running:**
   ```bash
   # Should see "WebSocket server running on ws://localhost:8080"
   npm run dev:transcription
   ```

2. **Verify Groq API key is set:**
   ```bash
   # Check .env.local file contains GROQ_API_KEY
   cat .env.local | grep GROQ_API_KEY
   ```

3. **Check browser console:**
   - Open Chrome DevTools (F12)
   - Look for "✅ Transcription WebSocket connected" message
   - Check for any WebSocket connection errors

4. **Verify port 8080 is available:**
   ```bash
   # On Mac/Linux
   lsof -i :8080

   # On Windows
   netstat -ano | findstr :8080
   ```

### Connection Failed Errors

If you see "Transcription WebSocket error" in the console:

- Make sure the transcription server is running (`npm run dev:transcription`)
- Check if port 8080 is blocked by firewall
- Try restarting both servers

### No Transcript Appearing

If the connection is successful but no text appears:

- Speak clearly into your microphone
- Check microphone permissions in Chrome
- Look for "📝 Transcript:" logs in the transcription server terminal
- Verify GROQ_API_KEY is valid and has credits

## Production Deployment

### Deploying WebSocket Server

The WebSocket server needs to run continuously, unlike serverless Next.js functions. Options:

#### Option 1: Docker Container

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY transcription-server.js ./
COPY .env.local ./
EXPOSE 8080
CMD ["node", "transcription-server.js"]
```

Deploy to: AWS ECS, Google Cloud Run, DigitalOcean, etc.

#### Option 2: VPS / EC2

1. SSH into your server
2. Clone the repository
3. Install dependencies: `npm install`
4. Set environment variables in `.env.local`
5. Run with process manager:
   ```bash
   # Using PM2
   pm2 start transcription-server.js --name transcription

   # Or systemd service
   sudo systemctl start transcription-server
   ```

#### Option 3: Heroku

```bash
# Create Procfile
echo "web: node transcription-server.js" > Procfile

# Deploy
heroku create your-app-name
heroku config:set GROQ_API_KEY=your_key_here
git push heroku main
```

### Update Extension Configuration

After deploying, update the WebSocket URL in `recorder-ui.js`:

```javascript
// Change from:
const wsUrl = 'ws://localhost:8080'

// To your production URL:
const wsUrl = 'wss://your-transcription-server.com'
```

## API Costs

- **Groq Whisper API**: FREE (with rate limits)
  - ~100 requests/minute
  - whisper-large-v3 model
  - 98+ languages supported

## Features

- ✅ Real-time transcription during recording
- ✅ Live transcript display in recorder UI
- ✅ Automatic language detection
- ✅ Word-level timestamps
- ✅ High accuracy (Whisper-large-v3)
- ✅ Free API usage (Groq)
- ✅ 98+ languages supported

## Support

For issues or questions:
1. Check the server logs in terminal
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure WebSocket server is running

## Architecture

```
┌─────────────────┐         WebSocket         ┌──────────────────┐
│  Chrome Ext     │◄──────(ws://localhost)────►│  Transcription   │
│  (recorder-ui)  │        Audio Chunks        │  Server (8080)   │
└─────────────────┘                            └──────────────────┘
                                                        │
                                                        │ HTTPS
                                                        ▼
                                               ┌──────────────────┐
                                               │   Groq Whisper   │
                                               │   API (FREE)     │
                                               └──────────────────┘
```
