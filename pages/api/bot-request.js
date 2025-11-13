import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req, res) {
  // Handle CORS
  const allowedOrigins = [
    'https://meet.google.com',
    'http://localhost:3001',
    'https://logam-portal-production.up.railway.app'
  ]

  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
    // Get session to identify the user
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { meetingUrl, meetingName } = req.body

    if (!meetingUrl) {
      return res.status(400).json({ error: 'Meeting URL is required' })
    }

    console.log('🤖 Bot request received:', {
      user: session.user.email,
      meetingUrl,
      meetingName
    })

    // Save bot request to Firestore
    const botRequestData = {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      meetingUrl,
      meetingName: meetingName || 'Untitled Meeting',
      status: 'pending', // pending, approved, joined, completed, failed
      requestedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    }

    const docRef = await addDoc(collection(db, 'bot-requests'), botRequestData)

    console.log('✅ Bot request saved:', docRef.id)

    return res.status(200).json({
      success: true,
      requestId: docRef.id,
      message: 'Bot request received. Admin will join shortly.'
    })

  } catch (error) {
    console.error('❌ Bot request error:', error)
    return res.status(500).json({
      error: 'Failed to process bot request',
      details: error.message
    })
  }
}
