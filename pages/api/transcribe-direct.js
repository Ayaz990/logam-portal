import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import formidable from 'formidable'
import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Direct Whisper executable approach (bypasses whisper-node parsing issues)
async function transcribeWithDirectWhisper(audioFilePath, options = {}) {
  return new Promise((resolve, reject) => {
    const whisperPath = path.join(process.cwd(), 'node_modules/whisper-node/lib/whisper.cpp/main')
    const modelPath = path.join(process.cwd(), 'node_modules/whisper-node/lib/whisper.cpp/models/ggml-tiny.en.bin')

    // Check if files exist
    if (!fs.existsSync(whisperPath)) {
      reject(new Error('Whisper executable not found'))
      return
    }

    if (!fs.existsSync(modelPath)) {
      reject(new Error('Whisper model not found'))
      return
    }

    const outputPath = audioFilePath + '.txt'

    // Run whisper directly
    const args = [
      '-m', modelPath,
      '-f', audioFilePath,
      '-l', options.language || 'en',
      '-otxt', // Output as text
      '-of', outputPath.replace('.txt', '') // Output file prefix
    ]

    console.log('🔄 Running Whisper directly:', whisperPath, args.join(' '))

    const whisperProcess = spawn(whisperPath, args)

    let stderr = ''
    let stdout = ''

    whisperProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    whisperProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    whisperProcess.on('close', (code) => {
      console.log(`Whisper process finished with code: ${code}`)
      console.log('Stdout:', stdout)
      console.log('Stderr:', stderr)

      if (code === 0) {
        // Read the output file
        try {
          if (fs.existsSync(outputPath)) {
            const transcriptText = fs.readFileSync(outputPath, 'utf8').trim()

            // Clean up output file
            fs.unlinkSync(outputPath)

            resolve({
              text: transcriptText,
              confidence: 0.9, // Default confidence
              method: 'direct_whisper'
            })
          } else {
            reject(new Error('Whisper output file not created'))
          }
        } catch (readError) {
          reject(new Error('Failed to read Whisper output: ' + readError.message))
        }
      } else {
        reject(new Error(`Whisper failed with code ${code}: ${stderr}`))
      }
    })

    whisperProcess.on('error', (error) => {
      reject(new Error('Failed to start Whisper process: ' + error.message))
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the uploaded file
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const audioFile = files.audio?.[0]
    const meetingId = fields.meetingId?.[0]

    if (!audioFile || !meetingId) {
      return res.status(400).json({ error: 'Audio file and meeting ID are required' })
    }

    // Update meeting status to processing
    const meetingRef = doc(db, 'meetings', meetingId)
    await updateDoc(meetingRef, {
      'transcript.status': 'processing',
      'transcript.startedAt': new Date()
    })

    console.log(`🎵 Processing audio file: ${audioFile.originalFilename}`)
    console.log(`📊 File size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`)

    // Convert WebM to WAV if needed (Whisper prefers WAV)
    let processedFilePath = audioFile.filepath

    if (audioFile.mimetype === 'video/webm' || audioFile.originalFilename?.endsWith('.webm')) {
      console.log('🔄 Converting WebM to WAV...')

      try {
        const ffmpeg = require('ffmpeg-static')
        const outputPath = audioFile.filepath + '.wav'

        await new Promise((resolve, reject) => {
          const ffmpegProcess = spawn(ffmpeg, [
            '-i', audioFile.filepath,
            '-ar', '16000', // 16kHz
            '-ac', '1',     // mono
            '-c:a', 'pcm_s16le',
            outputPath
          ])

          ffmpegProcess.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Audio converted successfully')
              processedFilePath = outputPath
              resolve()
            } else {
              console.log('⚠️ Audio conversion failed, using original')
              resolve()
            }
          })

          ffmpegProcess.on('error', () => {
            console.log('⚠️ FFmpeg error, using original file')
            resolve()
          })
        })
      } catch (error) {
        console.log('⚠️ Conversion error:', error.message)
      }
    }

    console.log('🎙️ Starting direct Whisper transcription...')

    try {
      const result = await transcribeWithDirectWhisper(processedFilePath, {
        language: 'en'
      })

      console.log('✅ Direct Whisper transcription completed')
      console.log('📝 Transcript preview:', result.text.substring(0, 100))

      // Prepare transcript data for storage
      const transcriptData = {
        text: result.text || '',
        confidence: result.confidence || 0.9,
        words: [], // Direct approach doesn't provide word-level timing
        segments: [], // Or segments
        paragraphs: result.text ? [{
          text: result.text,
          start: 0,
          end: 0,
          sentences: [{ text: result.text, start: 0, end: 0 }]
        }] : [],
        metadata: {
          method: 'direct_whisper',
          model: 'tiny.en',
          created: new Date().toISOString()
        }
      }

      // Create clean data object for Firebase
      const cleanTranscriptData = {
        text: transcriptData.text || '',
        confidence: transcriptData.confidence || 0,
        words: transcriptData.words || [],
        paragraphs: transcriptData.paragraphs || [],
        segments: transcriptData.segments || [],
        metadata: transcriptData.metadata || {},
        status: 'completed',
        processedAt: new Date()
      }

      // Update Firebase with transcript
      await updateDoc(meetingRef, {
        transcript: cleanTranscriptData
      })

      console.log('💾 Transcript saved to Firebase successfully')

      // Clean up temporary files
      fs.unlinkSync(audioFile.filepath)
      if (processedFilePath !== audioFile.filepath && fs.existsSync(processedFilePath)) {
        fs.unlinkSync(processedFilePath)
      }

      res.status(200).json({
        success: true,
        transcript: transcriptData,
        message: 'Transcript generated successfully using direct Whisper'
      })

    } catch (whisperError) {
      console.error('❌ Direct Whisper error:', whisperError)

      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': whisperError.message,
        'transcript.processedAt': new Date()
      })

      return res.status(500).json({
        error: 'Transcription failed',
        details: whisperError.message,
        method: 'direct_whisper'
      })
    }

  } catch (error) {
    console.error('❌ Transcription error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}