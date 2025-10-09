import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { collection, addDoc } from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let tempFilePath = null

  try {
    console.log('🚀 Starting upload process...')

    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // Reduced to 100MB for faster processing
      keepExtensions: true,
      uploadDir: '/tmp', // Use /tmp for faster file operations
    })

    console.log('📝 Parsing form data...')
    const [fields, files] = await form.parse(req)

    const videoFile = files.video?.[0]
    const meetUrl = fields.meetUrl?.[0]
    const timestamp = fields.timestamp?.[0]
    const meetingName = fields.meetingName?.[0] || 'Untitled Meeting'
    const duration = fields.duration?.[0]
    const userId = fields.userId?.[0] // Get userId from extension

    if (!videoFile || !meetUrl || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    tempFilePath = videoFile.filepath
    console.log(`📁 File parsed: ${videoFile.originalFilename} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`)

    // Generate unique filename
    const fileName = `recordings/${Date.now()}-${videoFile.originalFilename}`

    console.log('☁️ Uploading to Firebase Storage...')
    console.log('📦 Storage bucket:', storage.app.options.storageBucket)
    console.log('📂 Upload path:', fileName)

    // Upload file directly from temp path (more efficient)
    const fileBuffer = fs.readFileSync(videoFile.filepath)
    console.log('📊 Buffer size:', fileBuffer.length, 'bytes')

    const storageRef = ref(storage, fileName)
    console.log('🔗 Storage ref path:', storageRef.fullPath)

    try {
      const snapshot = await uploadBytes(storageRef, fileBuffer, {
        contentType: videoFile.mimetype || 'video/webm',
      })
      console.log('✅ Upload successful! Snapshot:', {
        fullPath: snapshot.ref.fullPath,
        bucket: snapshot.ref.bucket,
        name: snapshot.ref.name
      })
    } catch (uploadError) {
      console.error('❌ Firebase Storage upload failed:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    console.log('🔗 Getting download URL...')
    const downloadURL = await getDownloadURL(storageRef)

    console.log('💾 Saving to database...')
    // Save metadata to Firestore
    const meetingData = {
      userId: userId || 'anonymous', // Save userId (default to anonymous if not provided)
      meetUrl,
      timestamp: parseInt(timestamp),
      videoUrl: downloadURL,
      downloadURL: downloadURL, // Add both for compatibility
      fileName,
      fileSize: videoFile.size,
      mimeType: videoFile.mimetype || 'video/webm',
      meetingName,
      meetingTitle: meetingName, // Add both for compatibility
      duration: duration ? parseInt(duration) : null,
      transcript: {
        status: 'pending',
        text: null,
        words: [],
        confidence: null,
        processedAt: null
      },
      createdAt: new Date(),
    }

    const docRef = await addDoc(collection(db, 'meetings'), meetingData)
    console.log(`✅ Meeting saved with ID: ${docRef.id}`)

    // Clean up temporary file immediately
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
      console.log('🧹 Temporary file cleaned up')
    }

    // Return success immediately (don't wait for transcript)
    const response = {
      success: true,
      id: docRef.id,
      videoUrl: downloadURL,
      message: 'Recording uploaded successfully'
    }

    // Trigger transcription BEFORE responding (Vercel serverless requirement)
    if (process.env.AUTO_TRANSCRIPT === 'true') {
      console.log('🎤 Triggering transcript generation...')
      console.log(`📤 Calling trigger-transcribe for meeting: ${docRef.id}`)

      try {
        // Make the call but don't wait for completion
        const baseUrl = getBaseUrl()
        console.log(`🔗 Base URL: ${baseUrl}`)

        fetch(`${baseUrl}/api/trigger-transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.NEXTAUTH_SECRET
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
    console.error('❌ Upload error:', error)

    // Clean up temp file on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log('🧹 Temporary file cleaned up after error')
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }

    return res.status(500).json({
      error: 'Upload failed',
      details: error.message
    })
  }
}