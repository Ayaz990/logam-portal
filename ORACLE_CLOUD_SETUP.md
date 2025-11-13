# Oracle Cloud Bot Setup - Complete Guide

Deploy your bot service on Oracle Cloud **FREE FOREVER**! 🎉

## What You'll Get

- ✅ FREE VM instance (forever, no credit card charges)
- ✅ 1 GB RAM, 1-2 vCPU cores
- ✅ 50 GB storage
- ✅ Runs 24/7
- ✅ Perfect for bot service

---

## Part 1: Sign Up for Oracle Cloud

### Step 1: Create Account

1. Go to: https://www.oracle.com/cloud/free/
2. Click **"Start for free"**
3. Fill in your information:
   - Email address
   - Country/Region
   - First/Last name

4. Click **"Verify my email"**
5. Check your email and click verification link

### Step 2: Complete Registration

1. Choose **Account Type**: "Individual" (not company)
2. Create **Cloud Account Name** (e.g., `logam-meet-bot`)
   - This will be part of your login URL
   - Can't be changed later
3. Choose **Home Region** (pick closest to you)
   - Can't be changed later
   - Choose wisely!

### Step 3: Payment Verification

**Important:** Oracle requires credit card for verification but **WON'T charge you** for free tier resources.

1. Enter credit card details
2. You'll see a **$1 authorization** (refunded immediately)
3. This is just to verify you're real
4. You won't be charged for free tier services

### Step 4: Complete Setup

1. Wait for account provisioning (~2-5 minutes)
2. You'll get email confirmation
3. You can now login!

---

## Part 2: Create VM Instance (The Server)

### Step 1: Access Console

1. Login at: https://cloud.oracle.com
2. Click **"Sign in to Cloud"**
3. Enter your **Cloud Account Name** (from registration)
4. Click **"Next"**
5. Enter your email and password

### Step 2: Create Compute Instance

1. From dashboard, click **"Create a VM instance"**

   OR

   Navigate: **☰ Menu** → **Compute** → **Instances** → **Create Instance**

### Step 3: Configure Instance

#### Name:
```
logam-bot-service
```

#### Placement:
- Keep defaults (should show "Always Free-eligible")

#### Image and Shape:

**Image:**
1. Click **"Change Image"**
2. Select **"Canonical Ubuntu"** (22.04 or 20.04)
3. Click **"Select Image"**

**Shape:**
1. Click **"Change Shape"**
2. Select **"VM.Standard.E2.1.Micro"**
   - Should show **"Always Free-eligible"** label ✅
   - 1 GB RAM
   - 1 vCPU
3. Click **"Select Shape"**

#### Networking:

Keep defaults, but note:
- Create new VCN (Virtual Cloud Network) - auto-created
- Assign public IP: **YES** (checked)

#### Add SSH Keys:

**IMPORTANT:** You need SSH keys to access your server

**Option A: Generate New Keys (Recommended)**
1. Select **"Generate a key pair for me"**
2. Click **"Save Private Key"**
3. Save as `oracle-bot-key.key` (keep this safe!)
4. Click **"Save Public Key"** too (optional backup)

**Option B: Use Existing Keys (If you have)**
1. Select **"Paste public keys"**
2. Paste your public SSH key

#### Boot Volume:
- Keep default (50 GB)

### Step 4: Create Instance

1. Review settings
2. Make sure it says **"Always Free-eligible"** at the top
3. Click **"Create"**
4. Wait 2-3 minutes for provisioning
5. Status will change: **Provisioning** → **Running** ✅

### Step 5: Note Your Instance Details

Once running, note these details:

**Public IP Address:**
```
Example: 132.145.XXX.XXX
```
(You'll need this to connect)

**Username:**
```
ubuntu
```
(Default for Ubuntu images)

---

## Part 3: Configure Firewall (CRITICAL!)

Oracle Cloud has TWO firewalls - you need to configure BOTH:

### Firewall 1: Security List Rules

1. From your instance page, click **"Subnet"** link
2. Click on your subnet name
3. Click **"Default Security List"**
4. Click **"Add Ingress Rules"**

Add this rule:
- **Source CIDR:** `0.0.0.0/0`
- **IP Protocol:** `TCP`
- **Destination Port Range:** `22`
- **Description:** `SSH access`
- Click **"Add Ingress Rules"**

### Firewall 2: Ubuntu Firewall (iptables)

We'll configure this after connecting via SSH.

---

## Part 4: Connect to Your Server

### On Mac/Linux:

1. Open Terminal
2. Change key permissions:
```bash
chmod 400 ~/Downloads/oracle-bot-key.key
```

3. Connect via SSH:
```bash
ssh -i ~/Downloads/oracle-bot-key.key ubuntu@YOUR_PUBLIC_IP
```

Replace `YOUR_PUBLIC_IP` with your instance's IP address.

4. Type `yes` when asked about fingerprint

### On Windows:

**Option A: Using PowerShell (Windows 10/11)**
```powershell
ssh -i C:\Users\YourName\Downloads\oracle-bot-key.key ubuntu@YOUR_PUBLIC_IP
```

**Option B: Using PuTTY**
1. Download PuTTY from: https://www.putty.org/
2. Convert key using PuTTYgen (oracle-bot-key.key → .ppk format)
3. Use PuTTY to connect with converted key

### First Login:

You should see:
```
Welcome to Ubuntu 22.04.X LTS
...
ubuntu@logam-bot-service:~$
```

✅ You're in!

---

## Part 5: Install Dependencies

Copy and paste these commands one by one:

### Step 1: Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### Step 2: Install Node.js 18

```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Step 3: Install Git

```bash
sudo apt-get install -y git
```

### Step 4: Install Chrome Dependencies (for Puppeteer)

```bash
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
  wget \
  chromium-browser
```

This takes 2-3 minutes.

---

## Part 6: Deploy Bot Service

### Step 1: Clone Repository

```bash
# Clone your repo
git clone https://github.com/Ayaz990/logam-portal.git

# Navigate to bot service
cd logam-portal/bot-service
```

### Step 2: Create Environment File

```bash
nano .env
```

Paste this configuration (update values):

```bash
# Bot Google Account
BOT_EMAIL=botlogam@gmail.com
BOT_PASSWORD=Bot@logam07
BOT_DISPLAY_NAME=Logam Meeting Recorder

# Your Railway API URL
API_URL=https://logam-portal-production.up.railway.app

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Bot Settings
HEADLESS=true
AUTO_LEAVE_WHEN_ALONE=true
CHECK_INTERVAL=10000
```

**Important:** Get Firebase credentials from:
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy values from downloaded JSON file

**Save and exit:**
- Press `Ctrl+X`
- Press `Y`
- Press `Enter`

### Step 3: Install Dependencies

```bash
npm install
```

This takes 3-5 minutes (Puppeteer downloads Chromium).

### Step 4: Test Bot (Quick Test)

```bash
node index.js
```

You should see:
```
🤖 Logam Meet Bot Service Starting...
📧 Bot Email: botlogam@gmail.com
🔗 API URL: https://logam-portal-production.up.railway.app
✅ Bot service is running and monitoring...
```

✅ Working! Press `Ctrl+C` to stop.

---

## Part 7: Setup PM2 (Keep Bot Running 24/7)

### Step 1: Install PM2

```bash
sudo npm install -g pm2
```

### Step 2: Start Bot with PM2

```bash
# Start bot service
pm2 start index.js --name logam-bot

# You should see:
# ┌─────┬──────────────┬─────────┬─────────┐
# │ id  │ name         │ status  │ restart │
# ├─────┼──────────────┼─────────┼─────────┤
# │ 0   │ logam-bot    │ online  │ 0       │
# └─────┴──────────────┴─────────┴─────────┘
```

### Step 3: Configure Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Copy and run the command it shows
# It will look like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Save PM2 process list
pm2 save
```

### Step 4: Verify PM2 Status

```bash
pm2 status
```

Should show:
```
┌─────┬──────────────┬─────────┬─────────┬─────────┐
│ id  │ name         │ status  │ restart │ uptime  │
├─────┼──────────────┼─────────┼─────────┼─────────┤
│ 0   │ logam-bot    │ online  │ 0       │ 2m      │
└─────┴──────────────┴─────────┴─────────┴─────────┘
```

✅ Bot is running 24/7!

---

## Part 8: Test Bot Functionality

### Step 1: Request Bot from Dashboard

1. Go to: https://logam-portal-production.up.railway.app
2. Login to your account
3. Click **"Bot Requests"** tab
4. Enter a Google Meet URL
5. Click **"Request Bot Recording"**

### Step 2: Monitor Bot Logs

On your Oracle Cloud server:

```bash
# View live logs
pm2 logs logam-bot

# You should see:
# 🆕 New bot request received!
# 📋 Request ID: xxxxx
# 🚀 Starting bot for meeting...
```

### Step 3: Check Firestore

Go to Firebase Console → Firestore → `bot-requests`

You should see your request with status changing:
- `pending` → `joining` → `completed`

✅ Bot is working!

---

## Part 9: Useful Commands

### PM2 Management:

```bash
# View status
pm2 status

# View logs
pm2 logs logam-bot

# Restart bot
pm2 restart logam-bot

# Stop bot
pm2 stop logam-bot

# Delete from PM2
pm2 delete logam-bot
```

### Update Bot Code:

```bash
cd ~/logam-portal
git pull origin main
cd bot-service
npm install
pm2 restart logam-bot
```

### System Monitoring:

```bash
# Check disk space
df -h

# Check memory
free -h

# Check processes
htop
```

### Disconnect from Server:

```bash
exit
```

---

## Troubleshooting

### Can't Connect via SSH?

**Problem:** Connection timeout or refused

**Solutions:**
1. Check Security List rules (Part 3, Firewall 1)
2. Verify SSH key permissions: `chmod 400 oracle-bot-key.key`
3. Check instance is **Running** in Oracle Console
4. Verify you're using correct Public IP
5. Try adding your IP specifically in Security List

### Bot Can't Join Meetings?

**Problem:** Bot detects request but doesn't join

**Solutions:**
1. Check bot Google account needs verification
2. Login to botlogam@gmail.com manually once
3. Disable 2FA on bot account
4. Check meeting allows external guests
5. View logs: `pm2 logs logam-bot --lines 100`

### Puppeteer Errors?

**Problem:** Chrome launch errors

**Solutions:**
```bash
# Reinstall Chromium
cd ~/logam-portal/bot-service
rm -rf node_modules
npm install
pm2 restart logam-bot
```

### Out of Memory?

**Problem:** Bot crashes with memory errors

**Solutions:**
```bash
# Add swap space (virtual memory)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

### Check Bot is Running:

```bash
pm2 status
pm2 logs logam-bot
```

---

## Cost Summary

### Oracle Cloud Free Tier:
- ✅ **$0/month** - Forever free!
- ✅ 2 VM instances available
- ✅ Perfect for bot service

### Total Monthly Cost:
- **Railway** (Main App): ~$7-10/month
- **Oracle Cloud** (Bot): **$0** (FREE!)
- **Firebase** (Database/Storage): ~$0-2/month
- **Total**: **~$7-12/month**

---

## Security Best Practices

1. **Keep .env file secure:**
```bash
chmod 600 ~/logam-portal/bot-service/.env
```

2. **Update system regularly:**
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

3. **Monitor bot logs:**
```bash
pm2 logs logam-bot
```

4. **Setup firewall (optional but recommended):**
```bash
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## Quick Reference

**SSH Command:**
```bash
ssh -i ~/Downloads/oracle-bot-key.key ubuntu@YOUR_IP
```

**Bot Directory:**
```bash
cd ~/logam-portal/bot-service
```

**View Logs:**
```bash
pm2 logs logam-bot
```

**Restart Bot:**
```bash
pm2 restart logam-bot
```

**Update Bot:**
```bash
cd ~/logam-portal && git pull && cd bot-service && pm2 restart logam-bot
```

---

## What's Next?

✅ Your bot service is running 24/7 on Oracle Cloud **FREE!**

Users can now:
1. Go to dashboard
2. Click "Bot Requests"
3. Enter Google Meet URL
4. Bot joins automatically!

---

## Support

If you need help:
1. Check PM2 logs: `pm2 logs logam-bot`
2. Check Firestore bot-requests status
3. Verify environment variables in .env
4. Review bot-service/README.md

**Common Issues:**
- Bot not starting → Check logs: `pm2 logs`
- Can't SSH → Check Security List rules
- Out of memory → Add swap space (see Troubleshooting)
- Bot can't join → Check Google account verification

---

**Congratulations! Your bot service is FREE and running 24/7!** 🎉
