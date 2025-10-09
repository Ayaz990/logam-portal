# Testing Guide - Production Upload & Transcription

## ✅ What We Fixed

### Issue 1: Transcription Not Generating
**Problem:** Vercel Deployment Protection was blocking internal API calls
**Solution:** Added bypass token (`x7u1Wsruy7CQO4ECJrYkozs98O84sI7o`) to allow server-to-server calls

### Issue 2: Large Files Downloading Locally
**Problem:** Files over 100MB were failing to upload and downloading as backup
**Solution:**
- Increased file size limit: **100MB → 500MB**
- Increased upload timeout: **2 minutes → 5 minutes**
- Files now upload to Firebase regardless of size

---

## 🧪 How to Test

### Test 1: Small Recording (< 5MB)
1. Start a Google Meet
2. Record for **30 seconds**
3. Stop recording
4. **Expected:** Upload succeeds, transcription starts within 10 seconds

### Test 2: Medium Recording (5-50MB)
1. Start a Google Meet
2. Record for **3-5 minutes**
3. Stop recording
4. **Expected:** Upload succeeds, transcription starts within 30 seconds

### Test 3: Large Recording (50-200MB)
1. Start a Google Meet with screen share
2. Record for **15-20 minutes**
3. Stop recording
4. **Expected:**
   - Upload progress shows in extension
   - File uploads to Firebase (may take 1-2 minutes)
   - Transcription starts after upload completes
   - **NO local download should happen**

---

## 📊 How to Monitor

### Check Upload Success:
1. Watch the extension UI during upload
2. Should show: **"Recording saved to dashboard!"**
3. Should NOT show local download

### Check Transcription:
1. Go to dashboard: https://logam-portal.vercel.app/dashboard
2. Find your meeting
3. Wait 20-60 seconds
4. Refresh page - transcript should appear

### Check Vercel Logs:
Visit: https://vercel.com/dashboard (your project) → Deployments → View Function Logs

**Successful flow:**
```
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

---

## ⚠️ If Upload Still Fails

### Check Environment Variables:
Visit: https://logam-portal.vercel.app/api/debug-env

Should show:
```json
{
  "status": "OK",
  "checks": {
    "NEXTAUTH_SECRET": { "exists": true },
    "GROQ_API_KEY": { "exists": true },
    "USE_GROQ": { "exists": true, "value": "true" },
    "AUTO_TRANSCRIPT": { "exists": true, "value": "true" },
    "VERCEL_AUTOMATION_BYPASS_SECRET": { "exists": true }
  }
}
```

### If Transcription Fails:
1. Check Vercel logs for error messages
2. Verify Groq API key is valid
3. Check Firebase Storage rules allow uploads
4. Ensure meeting ID exists in Firestore

---

## 📝 Current Limits

| Feature | Limit | Notes |
|---------|-------|-------|
| **Max File Size** | 500MB | Same as Fireflies |
| **Upload Timeout** | 5 minutes | Enough for 500MB files |
| **Transcription Timeout** | 5 minutes | Groq Whisper is fast |
| **Supported Formats** | WebM, MP4 | Chrome records as WebM |

---

## 🎯 Expected Performance

| File Size | Upload Time | Transcribe Time | Total Time |
|-----------|-------------|-----------------|------------|
| 2MB (30s) | 5-10 sec | 10-15 sec | **~25 seconds** |
| 10MB (5min) | 15-30 sec | 20-30 sec | **~1 minute** |
| 50MB (20min) | 1-2 min | 30-60 sec | **~3 minutes** |
| 200MB (1hr) | 3-5 min | 60-120 sec | **~7 minutes** |

---

## ✅ Success Criteria

**Upload Working:**
- ✅ All files upload to Firebase
- ✅ No local downloads (unless manually requested)
- ✅ Progress bar shows during upload
- ✅ Success message appears in extension

**Transcription Working:**
- ✅ Transcript appears in dashboard within 1-2 minutes
- ✅ Text is accurate and in correct language
- ✅ Timestamps are correct
- ✅ Speaker detection works (if multiple speakers)

---

## 🚀 Ready to Test!

1. **Wait 2 minutes** for deployment to complete
2. **Reload the extension** in Chrome (important!)
3. **Join a Google Meet** and start recording
4. **Watch the magic happen** 🎉

All recordings should now:
- ✅ Upload to Firebase (no matter the size)
- ✅ Trigger transcription automatically
- ✅ Appear in your dashboard with transcript
