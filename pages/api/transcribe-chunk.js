import { spawn } from 'child_process'
import path from 'path'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Fast chunk transcription using Whisper
async function transcribeChunkWithWhisper(audioFilePath) {
  return new Promise((resolve, reject) => {
    const whisperPath = path.join(process.cwd(), 'node_modules/whisper-node/lib/whisper.cpp/main')
    const modelPath = path.join(process.cwd(), 'node_modules/whisper-node/lib/whisper.cpp/models/ggml-large-v3.bin')

    // Check if files exist
    if (!fs.existsSync(whisperPath)) {
      reject(new Error('Whisper executable not found'))
      return
    }

    if (!fs.existsSync(modelPath)) {
      reject(new Error('Large-v3 model not found'))
      return
    }

    const outputPath = audioFilePath + '.txt'

    // Optimized args for fast chunk processing
    const args = [
      '-m', modelPath,
      '-f', audioFilePath,
      '-otxt', // Output as text
      '-of', outputPath.replace('.txt', ''), // Output file prefix
      '-t', '2', // Use only 2 threads for faster response
      '-bs', '3', // Smaller beam size for speed
      '-bo', '3', // Fewer candidates for speed
    ]

    console.log('🔄 Processing chunk with Whisper:', args.join(' '))

    const whisperProcess = spawn(whisperPath, args)

    let stderr = ''

    whisperProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    whisperProcess.on('close', (code) => {
      if (code === 0) {
        try {
          if (fs.existsSync(outputPath)) {
            const transcriptText = fs.readFileSync(outputPath, 'utf8').trim()

            // Clean up output file
            fs.unlinkSync(outputPath)

            resolve({
              text: transcriptText,
              confidence: 0.9,
              method: 'chunk_whisper'
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
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://meet.google.com')
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
    console.log('🎤 Processing audio chunk...')

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB max for chunks
      keepExtensions: true,
      uploadDir: '/tmp',
    })

    const [fields, files] = await form.parse(req)

    const audioFile = files.audio?.[0]
    const timestamp = fields.timestamp?.[0]
    const isChunk = fields.isChunk?.[0]

    if (!audioFile || !isChunk) {
      return res.status(400).json({ error: 'Audio chunk is required' })
    }

    tempFilePath = audioFile.filepath

    console.log(`📁 Chunk size: ${(audioFile.size / 1024).toFixed(2)} KB`)

    // Skip very small chunks (less than 5KB)
    if (audioFile.size < 5000) {
      console.log('⏭️ Skipping tiny chunk')
      return res.status(200).json({ text: '', skipped: true })
    }

    // Convert WebM to WAV for better Whisper compatibility
    let processedFilePath = audioFile.filepath

    if (audioFile.mimetype === 'video/webm' || audioFile.originalFilename?.endsWith('.webm')) {
      try {
        const ffmpeg = require('ffmpeg-static')
        const { spawn } = require('child_process')

        const outputPath = audioFile.filepath + '.wav'

        await new Promise((resolve, reject) => {
          const ffmpegProcess = spawn(ffmpeg, [
            '-i', audioFile.filepath,
            '-ar', '16000', // 16kHz sample rate
            '-ac', '1',     // mono
            '-c:a', 'pcm_s16le', // PCM 16-bit
            '-y', // Overwrite output
            outputPath
          ])

          ffmpegProcess.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Chunk converted successfully')
              processedFilePath = outputPath
              resolve()
            } else {
              console.log('⚠️ Chunk conversion failed, using original')
              resolve() // Continue with original file
            }
          })

          ffmpegProcess.on('error', () => {
            console.log('⚠️ FFmpeg not available, using original file')
            resolve() // Continue with original file
          })
        })
      } catch (conversionError) {
        console.log('⚠️ Audio conversion failed:', conversionError.message)
        // Continue with original file
      }
    }

    // Fast transcription with Whisper
    const startTime = Date.now()
    const result = await transcribeChunkWithWhisper(processedFilePath)
    const duration = Date.now() - startTime

    console.log(`✅ Chunk transcribed in ${duration}ms:`, result.text?.substring(0, 50) + '...')

    // Cleanup
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
    if (processedFilePath !== tempFilePath && fs.existsSync(processedFilePath)) {
      fs.unlinkSync(processedFilePath)
    }

    res.status(200).json({
      success: true,
      text: result.text || '',
      confidence: result.confidence || 0.9,
      duration: duration,
      timestamp: timestamp
    })

  } catch (error) {
    console.error('❌ Chunk transcription error:', error)

    // Cleanup on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }

    return res.status(500).json({
      error: 'Chunk transcription failed',
      details: error.message
    })
  }
}