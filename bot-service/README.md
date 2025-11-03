# Logam Meet Bot Service

Automated bot service that joins Google Meet meetings as a participant and records them.

## 🚀 Features

- ✅ Automatically monitors Firestore for bot requests
- ✅ Joins Google Meet meetings with Puppeteer
- ✅ Records meetings (audio + video)
- ✅ Uploads recordings to your existing API
- ✅ Auto-triggers transcription
- ✅ Updates Firestore with recording status
- ✅ Leaves meeting when alone (configurable)

## 📋 Prerequisites

- Node.js 18+ installed
- Google account for bot (botlogam@gmail.com)
- Firebase Admin SDK credentials
- Your Next.js API running (localhost:3001)

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
cd bot-service
npm install
```

### 2. Configure Environment

The `.env` file is already configured with your credentials. If you need to change anything:

```bash
# Bot credentials
BOT_EMAIL=botlogam@gmail.com
BOT_PASSWORD=Bot@logam07
BOT_DISPLAY_NAME=Logam Meeting Recorder

# API URL
API_URL=http://localhost:3001

# Bot settings
HEADLESS=false          # Set to true for production
AUTO_LEAVE_WHEN_ALONE=true
```

### 3. Start Your Main API

Make sure your Next.js app is running first:

```bash
cd ..
npm run dev
```

This should start on `http://localhost:3001`

### 4. Start the Bot Service

In a new terminal:

```bash
cd bot-service
npm start
```

You should see:

```
🤖 Logam Meet Bot Service Starting...
📧 Bot Email: botlogam@gmail.com
🔗 API URL: http://localhost:3001
✅ Bot service is running and monitoring...
```

## 🎯 How to Use

### From the Chrome Extension:

1. Open Google Meet
2. Click "Request Bot Recording" button in the extension
3. The bot will automatically:
   - Detect the request in Firestore
   - Join the meeting
   - Record the session
   - Upload to Firebase
   - Transcribe with Groq Whisper
   - Appear in your dashboard

### From the Dashboard (Admin):

1. Go to "Bot Requests" tab
2. See all pending requests
3. Click "Join Meeting" to manually join
4. Bot runs automatically

## 📊 Bot Workflow

```
User clicks "Request Bot"
  ↓
Request saved to Firestore
  ↓
Bot service detects request (within 10 seconds)
  ↓
Bot logs into Google (botlogam@gmail.com)
  ↓
Bot joins meeting
  ↓
Bot records (camera off, mic off)
  ↓
Bot monitors meeting
  ↓
Bot leaves when meeting ends
  ↓
Bot uploads recording to /api/upload
  ↓
Auto-transcription starts
  ↓
Recording appears in dashboard
```

## 🔧 Configuration

### Headless Mode

For testing (see browser):
```
HEADLESS=false
```

For production (no UI):
```
HEADLESS=true
```

### Auto-leave Settings

Leave when bot is alone:
```
AUTO_LEAVE_WHEN_ALONE=true
```

Stay until manual stop:
```
AUTO_LEAVE_WHEN_ALONE=false
```

### Check Interval

How often to check Firestore (milliseconds):
```
CHECK_INTERVAL=10000  # 10 seconds
```

## 🐛 Troubleshooting

### Bot opens meeting tab then closes immediately

**Issue**: Bot logs in, opens meet tab for a second, then doesn't join

**Solution**:
This is the most common issue. The bot has been updated with:
1. ✅ Better join button detection (4 different methods)
2. ✅ Longer wait times for page to fully load
3. ✅ Keyboard shortcut fallback (Enter key)
4. ✅ Extensive debug logging and screenshots

**To debug this issue:**
1. Set `HEADLESS=false` in .env to watch the bot
2. Check debug screenshots in bot-service folder:
   - `debug-after-load-*.jpg` - What the page looks like
   - `debug-before-join-*.jpg` - Before attempting to join
   - `debug-after-join-*.jpg` - After join attempt
   - `debug-error-*.jpg` - If an error occurs
3. Check console logs - it shows all buttons found on page
4. Look for these log messages:
   - "🔍 Found buttons:" - Shows all buttons detected
   - "✅ Clicked button" - Success
   - "❌ No join button found" - Button not detected

**Common causes:**
- Google Meet UI changed (selectors need update)
- Page not fully loaded before join attempt
- Meeting requires "Ask to join" approval
- Camera/microphone permissions dialog blocking
- Google account security check

**Quick fixes:**
- Increase wait times in `joinMeeting()` function
- Check if Google account needs security verification
- Try manually logging into botlogam@gmail.com first
- Clear chrome user data: `rm -rf bot-service/chrome-user-data`

### Bot can't login to Google

**Issue**: Google blocks login attempts

**Solution**:
1. Login to botlogam@gmail.com manually in Chrome
2. Enable "Less secure app access" in Google Account settings
3. Or use Google App Password instead of regular password
4. Check if 2FA is enabled (disable it for bot account)

### Bot can't join meeting

**Issue**: "Ask to join" requires approval

**Solution**:
- Host must approve bot when it requests to join
- Or make meetings open to anyone with link
- Bot will wait up to 2 minutes for approval

### Recording failed

**Issue**: No video/audio captured

**Solution**:
- Make sure Chrome has proper permissions
- Check if meeting has screen sharing restrictions

### Upload failed

**Issue**: Cannot upload to API

**Solution**:
- Make sure Next.js dev server is running
- Check API_URL in .env is correct
- Check your internet connection

### Firestore not detecting requests

**Issue**: Bot not responding to requests

**Solution**:
- Verify Firebase credentials in .env
- Check Firestore security rules allow read/write
- Check bot-requests collection exists

## 📁 File Structure

```
bot-service/
├── index.js              # Main bot service (Firestore monitoring)
├── bot-controller.js     # Puppeteer logic (join, record, upload)
├── package.json          # Dependencies
├── .env                  # Configuration (keep secret!)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🚀 Production Deployment

### Option 1: VPS (Hostinger, DigitalOcean)

1. Copy bot-service folder to server
2. Install Node.js
3. Install dependencies: `npm install`
4. Set HEADLESS=true in .env
5. Run with PM2: `pm2 start index.js --name logam-bot`
6. Setup auto-restart: `pm2 startup`

### Option 2: Render.com

1. Push bot-service to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Add environment variables
5. Deploy!

## 🔒 Security Notes

- ⚠️ Never commit .env file to Git
- ⚠️ Keep bot password secure
- ⚠️ Use App Passwords instead of real password
- ⚠️ Restrict bot account access
- ⚠️ Monitor bot activity in Firestore

## 📈 Monitoring

Check bot status:
```bash
# View logs
tail -f bot-service.log

# Check active sessions
# Bot will log all activity to console
```

## 🛑 Stopping the Bot

Press `Ctrl+C` in the terminal running the bot.

The bot will:
- Close all active meeting sessions
- Clean up temporary files
- Shutdown gracefully

## 💡 Tips

1. **Test locally first** - Run with HEADLESS=false to see what's happening
2. **Monitor Firestore** - Check bot-requests collection for status updates
3. **Check logs** - Bot logs all actions to console
4. **Use App Passwords** - More secure than regular password
5. **Set meeting permissions** - Make meetings open or pre-approve bot

## 🆘 Support

If you need help:
1. Check the troubleshooting section above
2. Review bot logs in console
3. Check Firestore bot-requests status field
4. Verify all environment variables are correct

## 📝 License

MIT License - Use freely for your project
