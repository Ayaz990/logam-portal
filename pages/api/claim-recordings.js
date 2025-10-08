import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authenticated user
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = session.user.id

    console.log('🔍 Finding ALL recordings...')

    // Get ALL recordings
    const recordingsRef = collection(db, 'meetings')
    const allSnapshot = await getDocs(recordingsRef)

    console.log(`📝 Found ${allSnapshot.size} total recordings`)

    // Filter to only recordings that don't belong to current user
    const allDocs = allSnapshot.docs.filter(doc => {
      const data = doc.data()
      return !data.userId || data.userId === 'anonymous' || data.userId !== userId
    })

    console.log(`📝 Found ${allDocs.length} recordings to claim (excluding ones already owned)`)

    // Update each recording to assign to current user
    let updated = 0
    for (const docSnapshot of allDocs) {
      await updateDoc(doc(db, 'meetings', docSnapshot.id), {
        userId: userId
      })
      updated++
    }

    console.log(`✅ Successfully claimed ${updated} recordings for user ${userId}`)

    return res.status(200).json({
      success: true,
      claimed: updated,
      message: `Successfully claimed ${updated} recordings`
    })

  } catch (error) {
    console.error('❌ Error claiming recordings:', error)
    return res.status(500).json({
      error: 'Failed to claim recordings',
      details: error.message
    })
  }
}
