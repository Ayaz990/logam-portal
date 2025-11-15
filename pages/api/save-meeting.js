import { collection, addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'

export const config = {
  api: {
    bodyParser: true, // We only receive JSON metadata, not files
  },
  maxDuration: 60, // 1 minute is plenty for metadata-only
}

export default async function handler(req, res) {
  // Handle CORS
  const allowedOrigins = [
    'https://meet.google.com',
    'http://localhost:3001',
    'https://logam-portal.vercel.app'
  ]
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('💾 Saving meeting metadata (file already in Firebase)...')

    const {
      userId,
      meetUrl,
      timestamp,
      videoUrl,
      downloadURL,
      fileName,
      fileSize,
      mimeType,
      meetingName,
      duration,
      isRealtime,
      status,
      meetingId, // For updating existing meetings
      transcription // Real-time transcription from browser
    } = req.body

    // Validate required fields (videoUrl not required for initial real-time creation)
    if (!userId || !meetUrl || !timestamp) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'meetUrl', 'timestamp']
      })
    }

    console.log('📝 Meeting details:')
    console.log('  - User:', userId)
    console.log('  - Meeting:', meetingName)
    console.log('  - File size:', fileSize ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A (streaming)')
    console.log('  - Video URL:', videoUrl || 'N/A (will be set later)')
    console.log('  - Is realtime:', isRealtime || false)

    let docRef

    // Check if updating existing meeting or creating new one
    if (meetingId) {
      // Update existing meeting
      console.log('🔄 Updating existing meeting:', meetingId)
      const meetingRef = doc(db, 'meetings', meetingId)

      await updateDoc(meetingRef, {
        videoUrl: videoUrl || '',
        downloadURL: downloadURL || videoUrl || '',
        fileSize: fileSize || 0,
        duration: duration ? parseInt(duration) : null,
        status: status || 'completed',
        updatedAt: new Date()
      })

      docRef = { id: meetingId }
      console.log(`✅ Meeting updated: ${meetingId}`)
    } else {
      // Create new meeting
      const meetingData = {
        userId: userId,
        meetUrl,
        timestamp: parseInt(timestamp),
        videoUrl: videoUrl || '',
        downloadURL: downloadURL || videoUrl || '',
        fileName: fileName || `recordings/${timestamp}.webm`,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'video/webm',
        meetingName: meetingName || 'Untitled Meeting',
        meetingTitle: meetingName || 'Untitled Meeting',
        duration: duration ? parseInt(duration) : null,
        status: status || 'pending',
        isRealtime: isRealtime || false,
        transcript: transcription ? {
          status: 'completed',
          text: transcription,
          words: [],
          confidence: 0.9,
          processedAt: new Date()
        } : {
          status: isRealtime ? 'processing' : 'pending',
          text: null,
          words: [],
          confidence: null,
          processedAt: null
        },
        createdAt: new Date(),
        uploadMethod: 'direct-firebase'
      }

      docRef = await addDoc(collection(db, 'meetings'), meetingData)
      console.log(`✅ Meeting saved with ID: ${docRef.id}`)
    }

    // Return success immediately
    const response = {
      success: true,
      id: docRef.id,
      videoUrl: videoUrl,
      message: 'Meeting metadata saved successfully'
    }

    // Trigger transcription BEFORE responding
    if (process.env.AUTO_TRANSCRIPT === 'true') {
      console.log('🎤 Triggering transcript generation...')
      console.log(`📤 Calling trigger-transcribe for meeting: ${docRef.id}`)

      try {
        const baseUrl = getBaseUrl()
        console.log(`🔗 Base URL: ${baseUrl}`)

        // Make the call but don't wait for completion
        fetch(`${baseUrl}/api/trigger-transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.NEXTAUTH_SECRET,
            'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          },
          body: JSON.stringify({ meetingId: docRef.id })
        }).then(async (resp) => {
          if (resp.ok) {
            console.log(`✅ Transcript generation started`)
          } else {
            console.error(`❌ Trigger failed (${resp.status}):`, await resp.text())
          }
        }).catch(err => {
          console.error('❌ Trigger error:', err.message)
        })

        // Small delay to ensure the request starts
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('❌ Auto-transcript error:', error)
      }
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('❌ Save metadata error:', error)
    return res.status(500).json({
      error: 'Failed to save meeting metadata',
      details: error.message
    })
  }
}
