# Deploy to Railway - Complete Guide

This guide will help you deploy your entire application (Next.js + WebSocket Transcription Server) to Railway.

## Why Railway?

- ✅ Supports both Next.js and WebSocket servers
- ✅ $20/month credit (Pro plan) - enough for 50+ meetings
- ✅ Easy GitHub integration
- ✅ Automatic deployments
- ✅ Environment variables management
- ✅ Custom domains support

## Prerequisites

1. **GitHub Account** - Your code should be pushed to GitHub
2. **Railway Account** - Sign up at https://railway.app
3. **Groq API Key** - Get free API key from https://console.groq.com

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if not already connected
5. Select the **logam-meet** repository
6. Railway will automatically detect Next.js and start building

### Step 3: Configure Environment Variables

In Railway dashboard:

1. Click on your project
2. Go to **"Variables"** tab
3. Add these environment variables:

```bash
# Required - Firebase Config
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Required - Firebase Admin (Service Account)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Required - Groq API for Transcription
GROQ_API_KEY=your_groq_api_key_here
USE_GROQ=true

# WebSocket Port (Railway will auto-assign, but you can specify)
WS_PORT=8080

# NextAuth Configuration
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=generate_a_random_secret_here

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 4: Deploy!

Railway will automatically:
1. Install dependencies (`npm install`)
2. Build Next.js (`npm run build`)
3. Start the application (`npm run start:all`)

Both your Next.js app and WebSocket server will run together!

### Step 5: Get Your Railway URL

After deployment:
1. Railway will provide a URL like: `https://logam-meet-production-xxxx.up.railway.app`
2. Copy this URL

### Step 6: Update Chrome Extension

Update the WebSocket URL in your extension:

1. Open `chrome-extension/recorder-ui.js`
2. Find line 999:
   ```javascript
   const PRODUCTION_WS_URL = 'wss://YOUR_RAILWAY_APP_URL'
   ```
3. Replace with your Railway URL:
   ```javascript
   const PRODUCTION_WS_URL = 'wss://logam-meet-production-xxxx.up.railway.app'
   ```
   **Important:** Use `wss://` (secure WebSocket), not `https://`

4. Save and reload extension in Chrome

### Step 7: Test Everything

1. **Test Next.js App:**
   - Visit `https://your-app.railway.app`
   - Should see your login page
   - Try logging in

2. **Test WebSocket Server:**
   - Open Chrome extension
   - Start recording in Google Meet
   - Should see real-time transcription
   - Check browser console for connection messages

## Custom Domain (Optional)

To use your own domain:

1. In Railway dashboard, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `meet.yourdomain.com`)
4. Update your DNS records as instructed
5. Update `NEXTAUTH_URL` environment variable
6. Update extension WebSocket URL

## Monitoring & Logs

**View Logs:**
1. Railway dashboard → Your project
2. Click **"Deployments"**
3. Select latest deployment
4. View real-time logs

**Check if WebSocket is running:**
Look for this in logs:
```
✅ WebSocket server running on ws://localhost:8080
🎤 Groq Whisper-large-v3 ready for real-time transcription
```

## Cost Estimation

**Railway Pro Plan: $20/month includes $20 usage credit**

Estimated usage for 50 meetings (1 hour each):
- **CPU**: ~$2-3/month (light usage)
- **RAM**: ~$4-5/month (512MB constant)
- **Bandwidth**: ~$1-2/month (6GB)
- **Total**: ~$7-10/month

**You'll stay under the $20 credit!** ✅

For 100+ meetings, you might pay extra $5-10 beyond the credit.

## Troubleshooting

### Build Fails

**Problem:** "Build failed with exit code 1"

**Solution:**
1. Check build logs in Railway
2. Make sure all dependencies are in `package.json`
3. Try running `npm run build` locally first

### WebSocket Connection Failed

**Problem:** Extension can't connect to WebSocket

**Solution:**
1. Check Railway logs - is WebSocket server running?
2. Verify `GROQ_API_KEY` is set in Railway environment variables
3. Make sure you're using `wss://` (not `ws://`) in production URL
4. Check browser console for error messages

### Environment Variables Not Working

**Problem:** App can't access Firebase/Groq

**Solution:**
1. Railway dashboard → Variables
2. Make sure all variables are set
3. Redeploy after adding variables
4. Check for typos in variable names

### Transcription Not Working

**Problem:** Recording works but no transcript

**Solution:**
1. Check Railway logs for WebSocket messages
2. Verify `GROQ_API_KEY` is valid
3. Check Groq API console for rate limits
4. Look for errors in browser console

## Updating Your App

Railway auto-deploys on every push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically deploys!
```

## Rollback (if something breaks)

1. Railway dashboard → **"Deployments"**
2. Find previous working deployment
3. Click **"Redeploy"**

## Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Check logs first** - most issues show up in logs

## Next Steps After Deployment

1. ✅ Test login functionality
2. ✅ Test recording with transcription
3. ✅ Test dashboard video playback
4. ✅ Monitor Railway usage in first few days
5. ✅ Set up custom domain (optional)
6. ✅ Update extension in Chrome Web Store (if published)

---

## Quick Reference

**Development:**
```bash
npm run dev:all  # Runs both servers locally
```

**Production (Railway runs automatically):**
```bash
npm run start:all  # Both Next.js + WebSocket server
```

**Important URLs:**
- Railway Dashboard: https://railway.app/dashboard
- Groq Console: https://console.groq.com
- Your App: https://your-app.railway.app

**Cost per Meeting:**
- ~$0.15-0.20 per 1-hour meeting
- 50 meetings = ~$7-10/month
- 100 meetings = ~$15-20/month

You're all set! 🚀
