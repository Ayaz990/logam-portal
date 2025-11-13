# Deployment Guide - Vercel + Railway Setup

## Overview

**Best Setup:**
- ✅ **Vercel** for Next.js website (free or $20/month for Pro)
- ✅ **Railway** for transcription WebSocket service (~$3-5/month)

**Total Cost:** $3-5/month (or $23-25/month with Vercel Pro for larger uploads)

---

## Part 1: Deploy Website to Vercel

### Step 1: Push Code to GitHub

```bash
cd /Users/developerlogam/Documents/logam-meet
git add .
git commit -m "Update for Vercel + Railway deployment"
git push
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com/login
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your `logam-meet` repository
5. Click **"Deploy"**

**Vercel will auto-detect Next.js and deploy!**

### Step 3: Add Environment Variables

In Vercel dashboard:

1. Click your project → **"Settings"** → **"Environment Variables"**
2. Add these variables:

```env
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://logam-portal.vercel.app

FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

GROQ_API_KEY=your-groq-api-key
ADMIN_SECRET=your-admin-secret
```

3. Click **"Save"**
4. Redeploy (automatic)

### Step 4: Get Your Vercel URL

After deployment:
- **URL:** `https://logam-portal.vercel.app`
- Or use custom domain (optional)

---

## Part 2: Deploy Transcription Service to Railway

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `logam-meet` repository

### Step 2: Configure Service

1. In Railway, click **"Settings"**
2. Set **Root Directory:** `transcription-service`
3. Set **Start Command:** `npm start`
4. Click **"Save"**

### Step 3: Add Environment Variables

1. Click **"Variables"** tab
2. Add:
   ```
   GROQ_API_KEY=your_groq_api_key
   ```
3. Railway will auto-deploy (~2 minutes)

### Step 4: Get Railway URL

After deployment:
- Railway gives you: `https://logam-transcription-production.up.railway.app`
- **Copy this URL** - you'll need it for the extension

---

## Part 3: Update Chrome Extension

### Step 1: Update WebSocket URL

Open `chrome-extension/recorder-ui.js` line 1003:

```javascript
// Replace this:
const PRODUCTION_WS_URL = 'wss://YOUR-TRANSCRIPTION-SERVICE.up.railway.app'

// With your actual Railway URL:
const PRODUCTION_WS_URL = 'wss://logam-transcription-production.up.railway.app'
```

Save the file.

### Step 2: Rebuild Extension

```bash
cd chrome-extension
zip -r ../logam-meet-extension.zip *
cd ..
```

### Step 3: Install in Chrome

1. Open Chrome → `chrome://extensions`
2. Remove old extension if installed
3. Extract `logam-meet-extension.zip`
4. Click **"Load unpacked"**
5. Select the extracted folder
6. Done!

---

## Testing the Complete Setup

### 1. Test Website

1. Go to `https://logam-portal.vercel.app`
2. Sign in with your account
3. Check dashboard loads
4. View recordings

### 2. Test Chrome Extension

1. Join a Google Meet
2. Extension appears (bottom-left)
3. Click **"Start Recording"**
4. Enable **"Live Transcription"**
5. Speak → transcript appears in real-time
6. Stop recording → uploads to Firebase
7. View in dashboard

### 3. Test Admin Dashboard

1. Go to `https://logam-portal.vercel.app/admin`
2. Sign in as admin (ayazsmemon07@gmail.com)
3. View all users and recordings

---

## URLs Summary

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Website** | https://logam-portal.vercel.app | Next.js app, dashboard, API |
| **Transcription** | https://logam-transcription-production.up.railway.app | WebSocket server for real-time transcription |
| **Admin** | https://logam-portal.vercel.app/admin | Admin dashboard |

---

## Cost Breakdown

### Option 1: Vercel Free Tier

| Service | Cost |
|---------|------|
| Vercel (Hobby) | **FREE** |
| Railway (Transcription) | $3-5/month |
| **Total** | **$3-5/month** |

**Limitations:**
- 100GB bandwidth/month on Vercel
- 10 serverless functions
- Good for small-medium usage

### Option 2: Vercel Pro

| Service | Cost |
|---------|------|
| Vercel (Pro) | $20/month |
| Railway (Transcription) | $3-5/month |
| **Total** | **$23-25/month** |

**Benefits:**
- 1TB bandwidth/month
- Better serverless function limits
- Priority support
- Better for production/heavy usage

---

## Environment Variables Reference

### Vercel Environment Variables

```env
# NextAuth
NEXTAUTH_SECRET=random-secret-key-min-32-chars
NEXTAUTH_URL=https://logam-portal.vercel.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Optional
GROQ_API_KEY=gsk_your_groq_key (for post-recording transcription)
ADMIN_SECRET=your-admin-secret-key
```

### Railway Environment Variables

```env
# Transcription Service
GROQ_API_KEY=gsk_your_groq_api_key
```

---

## Troubleshooting

### Website Issues

**Problem:** Vercel deployment fails

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Check `package.json` has `"build": "next build"`

**Problem:** "NEXTAUTH_URL environment variable is not set"

**Solution:**
1. Add `NEXTAUTH_URL=https://logam-portal.vercel.app` in Vercel env vars
2. Redeploy

### Transcription Issues

**Problem:** WebSocket connection failed

**Solution:**
1. Check Railway service is running (not paused)
2. Verify `GROQ_API_KEY` is set in Railway
3. Ensure extension URL matches Railway URL exactly
4. Use `wss://` not `ws://`

**Problem:** No transcript appearing

**Solution:**
1. Check "Live Transcription" toggle is ON
2. Open browser console (F12) for errors
3. Check Railway logs for transcription errors
4. Verify GROQ_API_KEY is valid

### Extension Issues

**Problem:** Extension can't connect to website

**Solution:**
1. Check `chrome-extension/config.js` has correct Vercel URL
2. Rebuild extension zip
3. Reload extension in Chrome
4. Clear browser cache

---

## Advanced: Custom Domain (Optional)

### Add Custom Domain to Vercel

1. Go to Vercel project → **"Settings"** → **"Domains"**
2. Add your domain (e.g., `meet.logam.digital`)
3. Update DNS records as instructed
4. Update environment variable:
   ```
   NEXTAUTH_URL=https://meet.logam.digital
   ```
5. Update extension `config.js` with new domain
6. Rebuild extension

---

## Maintenance

### Updating the Website

```bash
# Make changes to code
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys on push!
```

### Updating Transcription Service

```bash
# Make changes to transcription-service/
git add transcription-service/
git commit -m "Update transcription"
git push

# Railway auto-deploys on push!
```

### Updating Extension

```bash
# Make changes to chrome-extension/
cd chrome-extension
zip -r ../logam-meet-extension.zip *

# Reload in Chrome
```

---

## Need Help?

### Check Logs

**Vercel Logs:**
1. Vercel dashboard → Project → "Logs"
2. View real-time function logs

**Railway Logs:**
1. Railway dashboard → Service → "Deployments"
2. Click latest deployment → View logs

**Chrome Extension Logs:**
1. Open Google Meet
2. Press F12 → Console tab
3. Look for errors

---

## Quick Reference Commands

```bash
# Push to GitHub
git add . && git commit -m "Update" && git push

# Rebuild extension
cd chrome-extension && zip -r ../logam-meet-extension.zip * && cd ..

# Test locally
npm run dev:all

# View Railway logs
# (Use Railway dashboard)

# View Vercel logs
# (Use Vercel dashboard)
```

---

**That's it! Your app is now running on Vercel + Railway with real-time transcription! 🎉**
