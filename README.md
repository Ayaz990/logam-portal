# Logam Meet - AI-Powered Meeting Recorder

Record, transcribe, and manage your Google Meet sessions with ease.

## 🌟 Features

- **One-Click Recording** - Chrome extension for instant recording
- **Cloud Storage** - All recordings securely stored in Firebase
- **AI Transcription** - Automatic transcription of meetings
- **Professional Dashboard** - Manage all your recordings
- **Black & White Theme** - Clean, minimalist design
- **Mobile Responsive** - Works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Firebase account
- Google Chrome

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd logam-meet
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env.local`:
```bash
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (for backend)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY="your_private_key"
```

4. **Run development server**
```bash
npm run dev
```

5. **Load Chrome extension**
- Open Chrome → `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `chrome-extension/` folder

## 📁 Project Structure

```
logam-meet/
├── chrome-extension/          # Chrome extension files
│   ├── recorder-ui.js        # Main recording logic
│   ├── background.js         # Service worker
│   ├── popup.html            # Extension popup
│   └── manifest.json         # Extension manifest
├── pages/                    # Next.js pages
│   ├── index.js             # Landing page
│   ├── dashboard.js         # Main dashboard
│   └── api/                 # API routes
├── components/              # React components
├── lib/                     # Utilities & Firebase config
└── public/                  # Static assets
```

## 🎨 Design

The entire application uses a consistent **black & white** theme:
- Black sidebar with white content
- Clean, minimalist UI
- Professional look and feel
- Smooth animations and transitions

## 📦 Chrome Extension Features

- **Robust Recording** - Error handling & retry logic
- **Stream Health Monitoring** - Tracks recording quality
- **Upload Progress** - Real-time progress bar
- **Auto-Retry** - 3 attempts with exponential backoff
- **Local Backup** - Downloads recording if upload fails
- **Keyboard Shortcuts** - Ctrl/Cmd+Shift+R to start/stop
- **Auto-Record** - Automatically starts when meeting begins

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage
- **Extension:** Chrome Extension Manifest V3

## 🚢 Deployment

See [PRODUCTION-GUIDE.md](./PRODUCTION-GUIDE.md) for detailed deployment instructions.

### Quick Deploy (Vercel)

```bash
npm install -g vercel
vercel --prod
```

## 🔒 Security

Update Firebase security rules:

**Firestore** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /meetings/{meeting} {
      allow read, write: if true; // Update for production
    }
  }
}
```

**Storage** (`storage.rules`):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /recordings/{filename} {
      allow read, write: if true; // Update for production
    }
  }
}
```

## 📝 Usage

### Recording a Meeting

1. Join a Google Meet session
2. Click the recorder button in the top-right corner
3. Allow screen sharing and microphone access
4. Click "Start Recording"
5. Click "Stop Recording" when done
6. Recording automatically uploads to dashboard

### Managing Recordings

1. Open the dashboard at `localhost:3000` or your deployed URL
2. View all recordings with metadata
3. Search/filter recordings
4. Download or play recordings
5. Delete recordings

## 🐛 Troubleshooting

**Extension not showing:**
- Refresh Google Meet page
- Check extension is enabled in `chrome://extensions/`

**Upload fails:**
- Ensure backend is running
- Check Firebase configuration
- Verify storage rules allow uploads

**No audio in recording:**
- Make sure to allow both screen sharing with audio
- Check browser permissions

## 📧 Support

For issues or questions, please open a GitHub issue.

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ by Logam Digital
