# Quick Start - Deploy in 15 Minutes

## What You'll Do

1. Deploy website to **Vercel** (5 min)
2. Deploy transcription to **Railway** (5 min)
3. Update extension URL (2 min)
4. Test everything (3 min)

**Cost:** $3-5/month (or FREE Vercel + $3-5 Railway)

---

## Step 1: Deploy to Vercel (5 minutes)

### Push Code

```bash
cd /Users/developerlogam/Documents/logam-meet
git add .
git commit -m "Switch to Vercel + Railway"
git push
```

### Deploy

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"New Project"**
4. Import `logam-meet` repo
5. Click **"Deploy"**

**Done!** Vercel gives you: `https://logam-portal.vercel.app`

### Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```env
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://logam-portal.vercel.app
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-email
GROQ_API_KEY=your-groq-key
ADMIN_SECRET=your-admin-secret
```

Click Save → Redeploys automatically

---

## Step 2: Deploy Transcription to Railway (5 minutes)

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. **"Deploy from GitHub repo"**
4. Select `logam-meet`
5. Click **"Settings"**
6. Set **Root Directory:** `transcription-service`
7. Click **"Variables"** → Add:
   ```
   GROQ_API_KEY=your_groq_api_key
   ```
8. Deploy (~2 min)

**Done!** Railway gives you: `https://logam-transcription-production.up.railway.app`

---

## Step 3: Update Extension (2 minutes)

Open `chrome-extension/recorder-ui.js` line 1003:

```javascript
// Replace:
const PRODUCTION_WS_URL = 'wss://YOUR-TRANSCRIPTION-SERVICE.up.railway.app'

// With your Railway URL:
const PRODUCTION_WS_URL = 'wss://logam-transcription-production.up.railway.app'
```

Rebuild extension:

```bash
cd chrome-extension
zip -r ../logam-meet-extension.zip *
```

Install in Chrome:
1. `chrome://extensions`
2. Remove old extension
3. Load unpacked with new zip

---

## Step 4: Test Everything (3 minutes)

### Test Website
1. Go to `https://logam-portal.vercel.app`
2. Sign in
3. View dashboard ✅

### Test Recording + Transcription
1. Join Google Meet
2. Click recorder (bottom-left)
3. **"Start Recording"**
4. Enable **"Live Transcription"**
5. Speak → see transcript ✅
6. Stop → uploads to Firebase ✅
7. View in dashboard ✅

---

## Done! 🎉

**Your URLs:**
- Website: `https://logam-portal.vercel.app`
- Transcription: `https://logam-transcription-production.up.railway.app`
- Admin: `https://logam-portal.vercel.app/admin`

**Cost:** ~$3-5/month (Vercel free + Railway $3-5)

---

## Troubleshooting

### "Transcription not working"

1. Check Railway service is running
2. Verify extension URL matches Railway URL
3. Use `wss://` (not `ws://`)
4. Check browser console (F12) for errors

### "Website 404 error"

1. Check Vercel deployment is complete
2. Verify environment variables are set
3. Check Vercel logs for errors

### "Extension can't upload"

1. Check `config.js` has correct Vercel URL
2. Rebuild extension
3. Reload in Chrome

---

**Need detailed help?** See `DEPLOYMENT_GUIDE.md`
