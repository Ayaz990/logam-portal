# Disable Vercel Deployment Protection

## The Problem
Your Vercel project has **Deployment Protection** enabled, which blocks internal API calls between your own serverless functions. This is why you're getting 401 authentication errors.

## The Solution
Disable Deployment Protection for Production (or exclude API routes from protection)

## Steps to Disable Protection:

### Option 1: Disable for Production (Recommended for this project)

1. Go to your Vercel Dashboard: https://vercel.com
2. Select your project (`logam-portal` or similar)
3. Go to **Settings** → **Deployment Protection**
4. Under **"Protection for Production Deployments"**:
   - **Either**: Set to **"Disabled"**
   - **Or**: Set to **"Only preview deployments"**
5. Click **Save**

### Option 2: Exclude API Routes (More Secure)

If you want to keep deployment protection for the UI but allow API calls:

1. Same steps as above, but instead of disabling completely:
2. Scroll to **"Protection Bypass for Automation"**
3. Add these paths to the exclusion list:
   ```
   /api/trigger-transcribe
   /api/transcribe
   /api/upload
   ```
4. Click **Save**

## After Making Changes:

The changes take effect immediately. Try uploading a new recording and check the logs.

You should now see:
```
✅ Transcript generation started
🔔 Trigger-transcribe called { isInternalCall: true }
✅ Internal API call authenticated
📥 Downloading video from...
```

## Alternative: Use API Key Bypass (Advanced)

If you must keep protection enabled, you can use Vercel's bypass token, but this is more complex and not recommended for internal API calls.

---

**TL;DR:** Go to Vercel Dashboard → Settings → Deployment Protection → Set to "Disabled" or "Only preview deployments"
