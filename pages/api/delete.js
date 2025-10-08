import { ref, deleteObject } from 'firebase/storage'
import { doc, deleteDoc, getDoc } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Recording ID is required' })
    }

    // Get the recording data first to find the file path
    const docRef = doc(db, 'meetings', id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return res.status(404).json({ error: 'Recording not found' })
    }

    const recordingData = docSnap.data()

    // Delete the file from Firebase Storage
    if (recordingData.fileName) {
      try {
        const storageRef = ref(storage, recordingData.fileName)
        await deleteObject(storageRef)
        console.log('File deleted from storage:', recordingData.fileName)
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with Firestore deletion even if storage deletion fails
      }
    }

    // Delete the document from Firestore
    await deleteDoc(docRef)

    return res.status(200).json({
      success: true,
      message: 'Recording deleted successfully'
    })

  } catch (error) {
    console.error('Delete error:', error)
    return res.status(500).json({
      error: 'Delete failed',
      details: error.message
    })
  }
}