import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    console.log('🔧 Manual transcribe request from:', session.user.email)

    const { meetingId, transcribeAll } = req.body

    let meetingsToTranscribe = []

    if (transcribeAll) {
      // Get all meetings for this user that don't have transcripts
      console.log('📋 Fetching all meetings without transcripts for user:', session.user.id)

      const meetingsRef = collection(db, 'meetings')
      const q = query(
        meetingsRef,
        where('userId', '==', session.user.id),
        where('transcript.status', 'in', ['pending', null, ''])
      )

      const snapshot = await getDocs(q)
      meetingsToTranscribe = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      console.log(`📊 Found ${meetingsToTranscribe.length} meetings without transcripts`)
    } else {
      // Single meeting
      if (!meetingId) {
        return res.status(400).json({ error: 'Meeting ID is required' })
      }

      const meetingRef = doc(db, 'meetings', meetingId)
      const meetingSnap = await getDoc(meetingRef)

      if (!meetingSnap.exists()) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      const meetingData = meetingSnap.data()

      // Verify ownership
      if (meetingData.userId !== session.user.id) {
        return res.status(403).json({ error: 'Not authorized' })
      }

      meetingsToTranscribe = [{ id: meetingId, ...meetingData }]
    }

    if (meetingsToTranscribe.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No meetings need transcription',
        processed: 0
      })
    }

    console.log(`🚀 Starting transcription for ${meetingsToTranscribe.length} meeting(s)...`)

    // Trigger transcription for each meeting
    const results = []
    const baseUrl = getBaseUrl()

    for (const meeting of meetingsToTranscribe) {
      try {
        console.log(`📤 Triggering transcription for meeting: ${meeting.id}`)
        console.log(`📹 Video URL: ${meeting.videoUrl}`)

        const response = await fetch(`${baseUrl}/api/trigger-transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.NEXTAUTH_SECRET,
            'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
          },
          body: JSON.stringify({ meetingId: meeting.id })
        })

        if (response.ok) {
          console.log(`✅ Transcription started for: ${meeting.id}`)
          results.push({
            meetingId: meeting.id,
            success: true,
            meetingName: meeting.meetingName
          })
        } else {
          const errorText = await response.text()
          console.error(`❌ Failed for ${meeting.id}:`, errorText)
          results.push({
            meetingId: meeting.id,
            success: false,
            error: errorText,
            meetingName: meeting.meetingName
          })
        }

        // Small delay between requests to avoid overwhelming the server
        if (meetingsToTranscribe.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`❌ Error triggering transcription for ${meeting.id}:`, error)
        results.push({
          meetingId: meeting.id,
          success: false,
          error: error.message,
          meetingName: meeting.meetingName
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`✅ Transcription triggered: ${successCount} success, ${failCount} failed`)

    return res.status(200).json({
      success: true,
      message: `Transcription triggered for ${successCount} meeting(s)`,
      processed: successCount,
      failed: failCount,
      results
    })

  } catch (error) {
    console.error('❌ Manual transcribe error:', error)
    return res.status(500).json({
      error: 'Failed to trigger transcription',
      details: error.message
    })
  }
}
