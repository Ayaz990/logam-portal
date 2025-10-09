import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Allow internal server-to-server calls with special header
    const internalApiKey = req.headers['x-internal-api-key']
    const isInternalCall = internalApiKey === process.env.NEXTAUTH_SECRET

    console.log('🔔 Trigger-transcribe called', { isInternalCall })

    // Check authentication (skip for internal calls)
    if (!isInternalCall) {
      const session = await getServerSession(req, res, authOptions)
      if (!session) {
        console.log('❌ Authentication failed - no session')
        return res.status(401).json({ error: 'Not authenticated' })
      }
    } else {
      console.log('✅ Internal API call authenticated')
    }

    const { meetingId } = req.body

    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required' })
    }

    console.log('🎤 Transcribe request for meeting:', meetingId)

    // Get meeting data from Firestore
    const meetingRef = doc(db, 'meetings', meetingId)
    const meetingSnap = await getDoc(meetingRef)

    if (!meetingSnap.exists()) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    const meetingData = meetingSnap.data()

    console.log('📤 Sending meeting info to transcribe API...')
    console.log('Video URL:', meetingData.videoUrl)
    console.log('File size:', meetingData.fileSize, 'bytes')

    // Send meeting ID to transcribe API (it will download the video directly from Firebase)
    const transcribeResponse = await fetch(`${getBaseUrl()}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      },
      body: JSON.stringify({
        meetingId,
        videoUrl: meetingData.videoUrl,
        mimeType: meetingData.mimeType || 'video/webm'
      })
    })

    if (!transcribeResponse.ok) {
      const errorText = await transcribeResponse.text()
      console.error('❌ Transcribe API failed:', errorText)
      throw new Error('Transcription failed')
    }

    console.log('✅ Transcription started successfully')

    return res.status(200).json({
      success: true,
      message: 'Transcription started'
    })

  } catch (error) {
    console.error('❌ Trigger transcribe error:', error)
    return res.status(500).json({
      error: 'Failed to trigger transcription',
      details: error.message
    })
  }
}
