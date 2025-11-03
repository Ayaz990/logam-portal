# 🚀 Quick Start Guide

Get the bot running in 3 minutes!

## Step 1: Install Dependencies (1 minute)

```bash
cd bot-service
npm install
```

Wait for all packages to install...

## Step 2: Start Your Main App (30 seconds)

In a separate terminal:

```bash
cd ..
npm run dev
```

Wait for: `✓ Ready on http://localhost:3001`

## Step 3: Start the Bot (30 seconds)

Back in the bot-service terminal:

```bash
npm start
```

You should see:

```
🤖 Logam Meet Bot Service Starting...
📧 Bot Email: botlogam@gmail.com
✅ Bot service is running and monitoring...
```

## ✅ You're Done!

The bot is now running and will automatically:
1. Monitor Firestore for bot requests
2. Join meetings when requested
3. Record and upload automatically

## 🧪 Test It

### Option 1: From Extension
1. Go to any Google Meet: https://meet.google.com/new
2. Open your extension
3. Click "Request Bot Recording"
4. Watch the bot join! 🎉

### Option 2: Manually Create Request
1. Go to Firebase Console
2. Add document to `bot-requests`:
```json
{
  "userId": "test",
  "userEmail": "test@test.com",
  "meetingUrl": "YOUR_MEET_URL",
  "meetingName": "Test Meeting",
  "status": "pending",
  "requestedAt": [current timestamp]
}
```
3. Watch the bot detect and join!

## 🎬 What You'll See

### In Bot Terminal:
```
🆕 New bot request received!
📋 Request ID: abc123
👤 User: test@test.com
🔗 Meeting URL: meet.google.com/xyz-abc-def
🚀 Starting bot for meeting: Test Meeting
🌐 Launching browser...
🔐 Logging in to Google account...
✅ Logged in successfully
📞 Joining meeting...
✅ Joined meeting successfully
🎥 Starting recording...
```

### In Your Browser (if HEADLESS=false):
- Chrome will open
- Bot logs into Google
- Bot joins the meeting
- You'll see the meeting interface

### In Dashboard:
- Recording appears after meeting ends
- Auto-transcription starts
- You can view/download

## 🐛 Common Issues

### "Login failed"
→ Google might be blocking. Login to botlogam@gmail.com manually first

### "Cannot find module"
→ Run `npm install` again

### "Bot not detecting requests"
→ Make sure Firebase credentials are correct in .env

### "Meeting join failed"
→ Bot might need approval if meeting has security settings

## 🛑 Stop the Bot

Press `Ctrl+C` in the bot terminal

## 📚 Next Steps

- Read full README.md for details
- Configure HEADLESS=true for production
- Deploy to VPS for 24/7 operation

Happy recording! 🎥
