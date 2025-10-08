import { whisper } from 'whisper-node'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the uploaded file
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
    })

    const [fields, files] = await form.parse(req)
    const audioFile = files.audio?.[0]

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    console.log('Transcribing audio file:', audioFile.originalFilename)

    // Initialize Whisper with local model
    const options = {
      modelName: 'base.en', // or 'tiny.en', 'small.en', 'medium.en', 'large'
      whisperOptions: {
        language: 'en',
        task: 'transcribe',
        fp16: false, // Use fp32 for better compatibility
      }
    }

    // Transcribe the audio
    const transcript = await whisper(audioFile.filepath, options)

    // Clean up the temporary file
    fs.unlinkSync(audioFile.filepath)

    // Return the transcript
    return res.status(200).json({
      success: true,
      transcript: transcript,
      duration: transcript.length,
      model: options.modelName,
      language: options.whisperOptions.language
    })

  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({
      success: false,
      error: 'Transcription failed',
      details: error.message
    })
  }
}