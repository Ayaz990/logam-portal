import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Starting migration of recordings...')

    const meetingsRef = collection(db, 'meetings')
    const snapshot = await getDocs(meetingsRef)

    let updated = 0
    let skipped = 0

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()

      // Check if downloadURL is missing but videoUrl exists
      if (!data.downloadURL && data.videoUrl) {
        console.log(`Migrating ${docSnap.id}: adding downloadURL from videoUrl`)
        await updateDoc(doc(db, 'meetings', docSnap.id), {
          downloadURL: data.videoUrl
        })
        updated++
      }
      // Check if meetingTitle is missing but meetingName exists
      else if (!data.meetingTitle && data.meetingName) {
        console.log(`Migrating ${docSnap.id}: adding meetingTitle from meetingName`)
        await updateDoc(doc(db, 'meetings', docSnap.id), {
          meetingTitle: data.meetingName
        })
        updated++
      } else {
        skipped++
      }
    }

    console.log(`✅ Migration complete: ${updated} updated, ${skipped} skipped`)

    res.status(200).json({
      success: true,
      updated,
      skipped,
      total: snapshot.size
    })

  } catch (error) {
    console.error('Migration error:', error)
    res.status(500).json({
      error: 'Migration failed',
      details: error.message
    })
  }
}
