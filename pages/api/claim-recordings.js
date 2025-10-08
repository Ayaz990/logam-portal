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

    console.log('🔍 Finding recordings without userId or with anonymous userId...')

    // Find all recordings without userId or with anonymous
    const recordingsRef = collection(db, 'meetings')
    const q1 = query(recordingsRef, where('userId', '==', 'anonymous'))
    const q2 = query(recordingsRef, where('userId', '==', null))

    const snapshot1 = await getDocs(q1)
    const snapshot2 = await getDocs(q2)

    const allDocs = [...snapshot1.docs, ...snapshot2.docs]

    console.log(`📝 Found ${allDocs.length} recordings to claim`)

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
