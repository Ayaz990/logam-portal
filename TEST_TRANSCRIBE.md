# Testing Transcription

## Quick Test Steps

1. **Record a 10-second meeting**
   - Go to https://meet.google.com/new
   - Click "Start Recording"
   - Wait 10 seconds
   - Click "Stop"

2. **Check Vercel Logs**
   - Go to: https://vercel.com/ayaz990s-projects/logam-portal/deployments
   - Click latest deployment
   - Click "Functions" tab
   - Look for `/api/trigger-transcribe` function
   - Click on it to see logs
   - Screenshot any errors you see

3. **Check if AUTO_TRANSCRIPT is set**
   - Go to: https://vercel.com/ayaz990s-projects/logam-portal/settings/environment-variables
   - Look for: `AUTO_TRANSCRIPT` = `true`
   - Look for: `USE_GROQ` = `true`
   - Look for: `GROQ_API_KEY` = (should have value)

## Common Issues

### Issue 1: Environment variables not set
**Solution:** Add them in Vercel dashboard, then redeploy

### Issue 2: Groq API key invalid
**Check:** Try calling Groq API manually:
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_GROQ_API_KEY"
```

### Issue 3: Video file too large
**Solution:** Record shorter meetings (10-30 seconds for testing)

### Issue 4: AUTO_TRANSCRIPT not triggering
**Check upload.js logs:**
- Should see: "🎤 Triggering transcript generation..."
- Should see: "📤 Calling trigger-transcribe for meeting: XXXX"

## Manual Test

If auto-transcript doesn't work, try manual:

1. Go to dashboard
2. Find a recording
3. Click the **green** transcript button (if no transcript exists)
4. Wait 1-2 minutes
5. Refresh page
6. Should see transcript

---

## What to send me

1. **Screenshot of Vercel logs** from /api/trigger-transcribe
2. **Screenshot of Vercel logs** from /api/transcribe
3. Tell me: "Did you see '🎤 Triggering transcript generation...' in upload logs?"
4. Tell me: "Is AUTO_TRANSCRIPT=true in Vercel env variables?"
