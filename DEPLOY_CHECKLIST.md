# Deployment Checklist for Transcription Fix

## Pre-Deployment

### ✅ Code Changes (Already Done)
- [x] Created `lib/getBaseUrl.js` helper
- [x] Updated `pages/api/upload.js` with internal API key
- [x] Updated `pages/api/trigger-transcribe.js` with auth bypass
- [x] Updated `pages/api/transcribe.js` with getBaseUrl()
- [x] Updated `pages/api/transcribe-multilingual.js` with getBaseUrl()
- [x] Added comprehensive logging for debugging

## Deployment Steps

### 1. Verify Environment Variables in Vercel

Go to your Vercel dashboard → Settings → Environment Variables

**Required variables:**
```
NEXTAUTH_SECRET=<same value as in your .env file>
GROQ_API_KEY=<your Groq API key>
USE_GROQ=true
AUTO_TRANSCRIPT=true
FIREBASE_PROJECT_ID=logam-meet
FIREBASE_CLIENT_EMAIL=<your Firebase service account email>
FIREBASE_PRIVATE_KEY=<your Firebase private key>
```

**Important:**
- `NEXTAUTH_SECRET` is **critical** for the internal API authentication to work
- Make sure it's set to the same value in both local `.env` and Vercel

### 2. Commit and Deploy

```bash
# Review changes
git status

# Commit
git add .
git commit -m "Fix: Production transcription with internal API auth and dynamic URLs

- Add getBaseUrl() helper for dynamic URL resolution
- Add internal API key authentication for server-to-server calls
- Fix trigger-transcribe authentication blocking auto-transcripts
- Add comprehensive logging for debugging production issues"

# Push to deploy
git push origin main
```

### 3. Monitor Deployment

```bash
# Watch deployment logs
vercel logs --follow

# Or use Vercel dashboard
# https://vercel.com/your-team/your-project/deployments
```

### 4. Test Production

1. **Upload a test recording** via your Chrome extension
2. **Check logs immediately** for the transcription flow:
   - Look for: `🔔 Trigger-transcribe called { isInternalCall: true }`
   - Look for: `✅ Internal API call authenticated`
   - Look for: `📥 Downloading video from:`
   - Look for: `✅ Transcript saved to Firebase successfully`

3. **Verify in dashboard** - Check that transcript appears in your meetings dashboard

### 5. Troubleshooting

If transcription still fails:

**Check 1: Environment Variables**
```bash
vercel env pull .env.production
# Verify NEXTAUTH_SECRET is set
```

**Check 2: Logs for Auth Errors**
```bash
vercel logs --follow | grep "❌"
# Look for authentication errors
```

**Check 3: NEXTAUTH_SECRET Match**
- Local `.env`: `NEXTAUTH_SECRET=vVnJGPBB/m9YQCZeqlKeZjSyhl0LwzKK4ZLRI/U0Yfs=`
- Vercel env variable: Must be **identical**

**Check 4: Base URL Resolution**
```bash
# In logs, look for the URL being called
# Should be: https://your-app.vercel.app/api/...
# NOT: http://localhost:3001/api/...
```

## Post-Deployment Verification

### Success Indicators:
- ✅ Upload completes with 200 status
- ✅ `trigger-transcribe` receives request
- ✅ Internal API auth succeeds
- ✅ Video downloads from Firebase
- ✅ Groq Whisper API called
- ✅ Transcript saved to Firestore
- ✅ Transcript visible in dashboard

### Expected Timeline:
- Upload: Instant
- Trigger: ~1-2 seconds after upload
- Download: ~2-5 seconds (depends on video size)
- Transcription: ~10-30 seconds (depends on audio length)
- Summary: ~5-10 seconds

Total: **~20-45 seconds** from upload to complete transcript

## Rollback Plan

If production breaks:

```bash
# Get previous deployment
vercel rollback

# Or revert the commit
git revert HEAD
git push origin main
```

## Support

If issues persist after deployment:
1. Check Vercel logs for specific errors
2. Verify all environment variables are set
3. Test locally first with `npm run dev`
4. Check Firebase console for any security rule issues
5. Verify Groq API key is valid and has quota
