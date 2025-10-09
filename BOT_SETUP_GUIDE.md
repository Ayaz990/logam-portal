# Bot-Based Meeting Recorder Setup Guide

## What We're Building

A bot that automatically joins Google Meet meetings (like Fireflies/tl;dv):
- ✅ No Chrome extension needed
- ✅ Automatically joins scheduled meetings
- ✅ Records as a meeting participant
- ✅ Works for all users without installation

---

## Step 1: Google Cloud Console Setup

### 1.1 Enable Required APIs

**Go to:** https://console.cloud.google.com/apis/library

**Enable these APIs:**
1. **Google Calendar API**
   - Search: "Google Calendar API"
   - Click "Enable"

2. **Google Meet API** (if available)
   - Search: "Google Meet API"
   - Click "Enable"
   - Note: This might be in limited preview

3. **Google People API** (for user info)
   - Search: "People API"
   - Click "Enable"

---

### 1.2 Configure OAuth Consent Screen

**Go to:** https://console.cloud.google.com/apis/credentials/consent

**Settings:**
- User Type: **External**
- App name: **Logam Meet Recorder**
- User support email: **your-email@gmail.com**
- Developer contact: **your-email@gmail.com**

**Scopes to add:**
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events.readonly
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

**Test users (if not verified):**
- Add your Gmail address

---

### 1.3 Create OAuth 2.0 Credentials

**Go to:** https://console.cloud.google.com/apis/credentials

**Click:** Create Credentials → OAuth client ID

**Settings:**
- Application type: **Web application**
- Name: **Logam Meet Web Client**

**Authorized redirect URIs:**
```
http://localhost:3001/api/auth/callback/google
https://logam-portal.vercel.app/api/auth/callback/google
```

**Save the:**
- Client ID
- Client Secret

---

## Step 2: Give Me Your Credentials

Once you complete Step 1, send me:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

I'll update the `.env` file automatically.

---

## What Happens Next

After you provide credentials, I will:

1. ✅ Update NextAuth to support Google Calendar login
2. ✅ Build calendar integration page
3. ✅ Create bot service (Puppeteer-based)
4. ✅ Add "Connect Calendar" button to dashboard
5. ✅ Build auto-join logic for scheduled meetings
6. ✅ Deploy bot service

---

## How It Will Work (User Flow)

### For Users:
1. Sign up on dashboard
2. Click "Connect Google Calendar"
3. Authorize calendar access
4. Bot automatically joins their scheduled Google Meet meetings
5. Recordings appear in dashboard

### For You (Admin):
1. See all users' recordings
2. Manage bot service
3. Monitor meeting joins

---

## Technical Architecture

```
┌─────────────────┐
│  User Calendar  │
│  (Google Cal)   │
└────────┬────────┘
         │
         │ Sync meetings
         ▼
┌─────────────────┐
│  Your Backend   │
│  (Next.js API)  │
└────────┬────────┘
         │
         │ Meeting detected
         ▼
┌─────────────────┐
│   Bot Service   │
│  (Puppeteer)    │
└────────┬────────┘
         │
         │ Join & Record
         ▼
┌─────────────────┐
│  Google Meet    │
│   (Meeting)     │
└─────────────────┘
```

---

## Current Status

⏳ **Waiting for you to:**
1. Enable Google Calendar API
2. Enable People API
3. Configure OAuth consent screen
4. Create OAuth credentials
5. Send me Client ID and Client Secret

Then I'll build the rest! 🚀
