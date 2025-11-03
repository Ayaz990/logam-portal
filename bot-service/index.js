require('dotenv').config()
const admin = require('firebase-admin')
const BotController = require('./bot-controller')

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
})

const db = admin.firestore()

console.log('🤖 Logam Meet Bot Service Starting...')
console.log('📧 Bot Email:', process.env.BOT_EMAIL)
console.log('🔗 API URL:', process.env.API_URL)
console.log('⏱️  Check Interval:', process.env.CHECK_INTERVAL, 'ms')
console.log('👤 Display Name:', process.env.BOT_DISPLAY_NAME)

// Active bot sessions
const activeSessions = new Map()

// Monitor Firestore for new bot requests
async function monitorBotRequests() {
  console.log('👀 Monitoring Firestore for bot requests...')

  // Listen for new pending bot requests
  const unsubscribe = db.collection('bot-requests')
    .where('status', '==', 'pending')
    .onSnapshot(async (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const request = {
            id: change.doc.id,
            ...change.doc.data()
          }

          console.log('\n🆕 New bot request received!')
          console.log('📋 Request ID:', request.id)
          console.log('👤 User:', request.userEmail)
          console.log('🔗 Meeting URL:', request.meetingUrl)
          console.log('📝 Meeting Name:', request.meetingName)

          // Process the request
          await handleBotRequest(request)
        }
      })
    }, (error) => {
      console.error('❌ Firestore listener error:', error)
    })

  // Keep the process running
  console.log('✅ Bot service is running and monitoring...')
  console.log('Press Ctrl+C to stop\n')
}

// Handle a bot request
async function handleBotRequest(request) {
  try {
    // Check if already processing this meeting
    if (activeSessions.has(request.meetingUrl)) {
      console.log('⚠️  Already processing this meeting, skipping...')
      return
    }

    // Update status to "joining"
    await db.collection('bot-requests').doc(request.id).update({
      status: 'joining',
      joinedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    console.log('🚀 Starting bot for meeting:', request.meetingName)

    // Create bot controller
    const bot = new BotController({
      email: process.env.BOT_EMAIL,
      password: process.env.BOT_PASSWORD,
      displayName: process.env.BOT_DISPLAY_NAME,
      headless: process.env.HEADLESS === 'true',
      apiUrl: process.env.API_URL
    })

    // Track this session
    activeSessions.set(request.meetingUrl, bot)

    // Join meeting and record
    const result = await bot.joinAndRecord(request.meetingUrl, {
      meetingName: request.meetingName,
      userId: request.userId,
      requestId: request.id
    })

    console.log('✅ Bot session completed:', result)

    // Update request status
    const updateData = {
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      videoUrl: result.videoUrl
    }

    // Only add recordingId if it exists
    if (result.recordingId) {
      updateData.recordingId = result.recordingId
    }

    await db.collection('bot-requests').doc(request.id).update(updateData)

    // Remove from active sessions
    activeSessions.delete(request.meetingUrl)

  } catch (error) {
    console.error('❌ Bot request failed:', error)

    // Update request status to failed
    try {
      await db.collection('bot-requests').doc(request.id).update({
        status: 'failed',
        error: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    } catch (updateError) {
      console.error('❌ Failed to update request status:', updateError)
    }

    // Remove from active sessions
    activeSessions.delete(request.meetingUrl)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bot service...')

  // Close all active sessions
  for (const [meetingUrl, bot] of activeSessions) {
    console.log('🔌 Closing session:', meetingUrl)
    try {
      await bot.close()
    } catch (error) {
      console.error('Error closing bot session:', error)
    }
  }

  console.log('👋 Bot service stopped')
  process.exit(0)
})

// Start monitoring
monitorBotRequests().catch(error => {
  console.error('❌ Failed to start bot service:', error)
  process.exit(1)
})
