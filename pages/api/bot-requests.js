import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'

/**
 * Get bot requests for the current user
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const userId = session.user.id

    // Fetch bot requests for this user
    const botRequestsRef = collection(db, 'bot-requests')
    const q = query(
      botRequestsRef,
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    )

    const querySnapshot = await getDocs(q)
    const botRequests = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      botRequests.push({
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || null,
        joinedAt: data.joinedAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        failedAt: data.failedAt?.toDate?.()?.toISOString() || null
      })
    })

    return res.status(200).json({
      success: true,
      botRequests,
      count: botRequests.length
    })
  } catch (error) {
    console.error('Bot requests API error:', error)
    return res.status(500).json({
      error: 'Failed to fetch bot requests',
      message: error.message
    })
  }
}
