# Production Deployment Checklist

## Before Deployment

### 1️⃣ Get Your Production URL
First, deploy to Vercel/Netlify and get your URL (e.g., `https://logam-meet.vercel.app`)

---

## 2️⃣ Update Extension Config

**File: `chrome-extension/config.js`**

```javascript
// Change this line:
const API_URL = 'http://localhost:3001' // ❌ Delete this

// To this:
const API_URL = 'https://your-production-url.vercel.app' // ✅ Your actual URL
```

---

## 3️⃣ Set Environment Variables on Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables:**

```bash
# Firebase Admin (Backend)
FIREBASE_PROJECT_ID=logam-meet
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@logam-meet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----\n"

# Firebase Client (Frontend) - These are SAFE to expose
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyApNW2lw2xEuXTl5MdV71Sa4FoGVIoOgIk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=logam-meet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=logam-meet
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=logam-meet.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=869899055721
NEXT_PUBLIC_FIREBASE_APP_ID=1:869899055721:web:43f31cae7a8c02d9e928f8

# NextAuth
NEXTAUTH_SECRET=vVnJGPBB/m9YQCZeqlKeZjSyhl0LwzKK4ZLRI/U0Yfs=
NEXTAUTH_URL=https://your-production-url.vercel.app  # ⚠️ CHANGE THIS!

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-production-url.vercel.app/api/auth/callback/google  # ⚠️ CHANGE THIS!

# API Keys (Optional but recommended)
DEEPGRAM_API_KEY=your-deepgram-api-key
GROQ_API_KEY=your-groq-api-key
USE_GROQ=true
AUTO_TRANSCRIPT=true
```

---

## 4️⃣ Update CORS Settings

**File: `pages/api/upload.js`** (Line 15)

```javascript
// Change from:
res.setHeader('Access-Control-Allow-Origin', 'https://meet.google.com')

// To (to allow both localhost and production):
const allowedOrigins = [
  'https://meet.google.com',
  'http://localhost:3001',
  'https://your-production-url.vercel.app'
]
const origin = req.headers.origin
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin)
}
```

---

## 5️⃣ Build & Package Extension

```bash
cd chrome-extension
# Make sure config.js has production URL
# Zip all files
zip -r logam-meet-extension.zip . -x "*.git*" -x "node_modules/*"
```

---

## 6️⃣ Deploy to Vercel

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod
```

Or push to GitHub and connect to Vercel Dashboard

---

## 7️⃣ Post-Deployment Tasks

### Update Firebase Security Rules

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Meetings collection
    match /meetings/{meetingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if request.auth != null &&
        (resource.data.userId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recordings/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if request.auth != null;
    }
  }
}
```

### Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. Find your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   ```
   https://your-production-url.vercel.app/api/auth/callback/google
   ```

---

## 8️⃣ Test Production

1. **Test Login:**
   - Visit `https://your-production-url.vercel.app`
   - Sign up with new account
   - Make one user admin: `node scripts/make-admin.js admin@test.com`

2. **Test Extension:**
   - Install extension from zip file
   - Open Google Meet
   - Click "Start Recording"
   - Should connect to production URL
   - Should ask for login if not logged in

3. **Test Recording Upload:**
   - Record a short meeting
   - Check if it appears in dashboard
   - Check Firebase Storage for video file

---

## 🚨 Security Checklist

- ✅ Never commit `.env` file to git
- ✅ Use environment variables on Vercel
- ✅ Firebase rules are set (not open to public)
- ✅ CORS only allows necessary origins
- ✅ NEXTAUTH_SECRET is secure random string
- ✅ API keys are kept secret (not in client code)

---

## 📝 What to Give Me

Just reply with:
```
Production URL: https://your-app.vercel.app
```

And I'll update all the necessary files automatically!

---

## 🔄 Future Updates

When you update the extension:
1. Update version in `manifest.json`
2. Re-zip the extension
3. Users need to reload extension in Chrome

When you update the backend:
1. Just push to GitHub (auto-deploys on Vercel)
2. Or run `vercel --prod`
