import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(req, res, authOptions)

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }

    // Fetch all users
    const usersRef = collection(db, 'users')
    const usersSnapshot = await getDocs(usersRef)

    const users = []

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()

      // Count recordings for this user
      const recordingsRef = collection(db, 'recordings')
      const recordingsQuery = query(recordingsRef, where('userId', '==', userDoc.id))
      const recordingsSnapshot = await getDocs(recordingsQuery)

      users.push({
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'regular',
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        recordingCount: recordingsSnapshot.size,
        lastLogin: userData.lastLogin?.toDate?.() || null
      })
    }

    // Sort by recording count (descending)
    users.sort((a, b) => b.recordingCount - a.recordingCount)

    return res.status(200).json({
      success: true,
      users,
      totalUsers: users.length,
      totalRecordings: users.reduce((sum, user) => sum + user.recordingCount, 0)
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    })
  }
}
