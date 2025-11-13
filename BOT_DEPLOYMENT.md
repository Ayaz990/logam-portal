# Bot Service Deployment Guide

## Overview

The **Bot Service** is a separate Node.js application that automatically joins Google Meet meetings and records them. It monitors Firestore for bot requests and joins meetings using Puppeteer (headless Chrome).

## Architecture

```
┌─────────────────┐
│   User Dashboard│  →  Request Bot
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Firestore    │  ←  Bot Service Monitors
│  (bot-requests) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Bot Service   │  →  Joins Google Meet
│   (Puppeteer)   │  →  Records Meeting
│                 │  →  Uploads to API
└─────────────────┘
```

## Important Notes

### Why Separate Deployment?

The bot service **CANNOT** run on Railway (or Vercel/Netlify) because:
- Requires full Chrome/Chromium browser
- Needs persistent browser sessions
- Uses Puppeteer (headless browser automation)
- Requires graphical libraries

### Where to Deploy Bot Service?

You have two options:

## Option 1: VPS Deployment (Recommended)

Deploy to a Virtual Private Server with full system access:

### Recommended Providers:
- **DigitalOcean** ($4-6/month) - Easy setup
- **Hostinger VPS** ($4-8/month) - Good for beginners
- **Linode** ($5/month) - Reliable
- **AWS EC2** (Free tier available) - More complex

### Setup Steps:

#### 1. Choose and Setup VPS

Sign up for a VPS provider and create an Ubuntu server.

#### 2. SSH into Your Server

```bash
ssh root@your-server-ip
```

#### 3. Install Node.js

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 4. Install Chrome Dependencies

```bash
# Install required libraries for Puppeteer
sudo apt-get update
sudo apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget
```

#### 5. Clone Your Repository

```bash
# Install git if needed
sudo apt-get install -y git

# Clone your repo
git clone https://github.com/Ayaz990/logam-portal.git
cd logam-portal/bot-service
```

#### 6. Configure Environment

```bash
# Create .env file
nano .env
```

Add these variables:

```bash
# Bot Google Account
BOT_EMAIL=botlogam@gmail.com
BOT_PASSWORD=Bot@logam07
BOT_DISPLAY_NAME=Logam Meeting Recorder

# Your Railway API URL
API_URL=https://logam-portal-production.up.railway.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Bot Settings
HEADLESS=true
AUTO_LEAVE_WHEN_ALONE=true
CHECK_INTERVAL=10000
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

#### 7. Install Dependencies

```bash
npm install
```

#### 8. Test the Bot

```bash
# Test run (watch for errors)
node index.js
```

You should see:
```
🤖 Logam Meet Bot Service Starting...
✅ Bot service is running and monitoring...
```

Press `Ctrl+C` to stop.

#### 9. Setup PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start bot service with PM2
pm2 start index.js --name logam-bot

# Setup PM2 to start on server reboot
pm2 startup
pm2 save

# Check status
pm2 status
```

#### 10. View Logs

```bash
# Live logs
pm2 logs logam-bot

# Or specific number of lines
pm2 logs logam-bot --lines 100
```

### Bot Service Management Commands

```bash
# Check status
pm2 status

# Restart bot
pm2 restart logam-bot

# Stop bot
pm2 stop logam-bot

# View logs
pm2 logs logam-bot

# Monitor resources
pm2 monit
```

### Updating Bot Service

```bash
cd logam-portal
git pull origin main
cd bot-service
npm install
pm2 restart logam-bot
```

---

## Option 2: Docker Deployment (Advanced)

If your VPS supports Docker:

### Create Dockerfile in bot-service folder:

```dockerfile
FROM node:18

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    ca-certificates fonts-liberation libappindicator1 libnss3 \
    lsb-release xdg-utils wget

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy bot service files
COPY . .

# Run bot
CMD ["node", "index.js"]
```

### Build and Run:

```bash
# Build image
docker build -t logam-bot .

# Run container
docker run -d \
  --name logam-bot \
  --restart unless-stopped \
  --env-file .env \
  logam-bot
```

---

## Testing the Bot

### 1. From Dashboard

1. Login to your app: `https://logam-portal-production.up.railway.app`
2. Go to **"Bot Requests"** tab
3. Enter a Google Meet URL
4. Click **"Request Bot Recording"**

### 2. Check Bot Service Logs

```bash
# If using PM2
pm2 logs logam-bot

# If using Docker
docker logs -f logam-bot
```

### 3. Monitor in Firestore

Go to Firebase Console → Firestore → `bot-requests` collection

You should see your request with status changing:
- `pending` → Bot detected request
- `joining` → Bot is joining meeting
- `completed` → Recording uploaded
- OR `failed` → Check logs for error

---

## Troubleshooting

### Bot Not Joining Meetings

**Problem**: Bot detects request but doesn't join

**Solutions**:
1. Check if bot Google account (botlogam@gmail.com) needs verification
2. Try logging into bot account manually first
3. Set `HEADLESS=false` temporarily to see what's happening
4. Check meeting permissions (must allow external guests)

### Puppeteer Errors

**Problem**: Chrome/Chromium launch errors

**Solutions**:
```bash
# Install missing dependencies
sudo apt-get install -y chromium-browser

# Or let Puppeteer download Chrome
cd bot-service
node node_modules/puppeteer/install.js
```

### Recording Upload Fails

**Problem**: Bot records but upload fails

**Solutions**:
1. Check `API_URL` in .env matches your Railway URL
2. Verify Railway app is running
3. Check network connectivity from VPS
4. Look for upload errors in bot logs

### Bot Service Crashes

**Problem**: PM2 shows bot as errored/stopped

**Solutions**:
```bash
# View error logs
pm2 logs logam-bot --err

# Restart with fresh state
pm2 delete logam-bot
pm2 start index.js --name logam-bot

# Check system resources
free -h
df -h
```

### Google Account Issues

**Problem**: Bot can't login to Google

**Solutions**:
1. Login to botlogam@gmail.com manually
2. Enable "Less secure app access" (if available)
3. Use App Password instead of regular password
4. Disable 2FA for bot account
5. Complete any security checks Google requires

---

## Cost Estimation

### VPS Hosting:
- **DigitalOcean**: $4-6/month
- **Hostinger**: $4-8/month
- **Linode**: $5/month
- **AWS EC2 t2.micro**: Free tier (12 months)

### Total Monthly Cost:
- **Main App** (Railway): ~$7-10/month (for 50 meetings)
- **Bot Service** (VPS): ~$4-6/month
- **Total**: ~$11-16/month

---

## Security Notes

1. **Keep .env Secret**: Never commit to Git
2. **Use App Passwords**: More secure than regular passwords
3. **Restrict Bot Account**: Only use for bot purposes
4. **Monitor Usage**: Check bot activity regularly
5. **Update Dependencies**: Keep Puppeteer and Node.js updated

---

## Production Checklist

- [ ] VPS setup and accessible via SSH
- [ ] Node.js 18+ installed
- [ ] Chrome dependencies installed
- [ ] Bot service cloned from GitHub
- [ ] .env file configured with all variables
- [ ] Dependencies installed (`npm install`)
- [ ] Test run successful
- [ ] PM2 installed and bot running
- [ ] PM2 startup configured
- [ ] Firewall configured (if needed)
- [ ] Bot Google account verified
- [ ] Test bot request from dashboard
- [ ] Monitor logs for errors
- [ ] Verify recording uploads

---

## Quick Reference

**Start Bot**: `pm2 start index.js --name logam-bot`

**Stop Bot**: `pm2 stop logam-bot`

**Restart Bot**: `pm2 restart logam-bot`

**View Logs**: `pm2 logs logam-bot`

**Bot Status**: `pm2 status`

**Update Bot**:
```bash
cd logam-portal && git pull
cd bot-service && npm install
pm2 restart logam-bot
```

---

## Support

If you need help:
1. Check bot service logs: `pm2 logs logam-bot`
2. Check Firestore bot-requests status
3. Verify all environment variables
4. Test with HEADLESS=false to see browser
5. Review bot-service/README.md for detailed troubleshooting

---

**Note**: The bot service must run on a server with full system access. It cannot run on serverless platforms like Railway, Vercel, or Netlify due to Puppeteer requirements.
