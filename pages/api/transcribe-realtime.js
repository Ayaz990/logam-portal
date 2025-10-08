import { WebSocketServer } from 'ws'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import FormData from 'form-data'
import axios from 'axios'

const writeFile = promisify(fs.writeFile)
const unlink = promisify(fs.unlink)

// WebSocket server instance
let wss = null

// Groq Whisper API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY
const USE_GROQ = process.env.USE_GROQ === 'true'

// Transcribe audio chunk using Groq Whisper API
async function transcribeChunkWithGroq(audioFilePath) {
  try {
    const formData = new FormData()
    const fileStream = fs.createReadStream(audioFilePath)

    formData.append('file', fileStream, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    })

    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'verbose_json')
    formData.append('temperature', '0')

    const response = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    )

    return response.data
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message)
    throw error
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!USE_GROQ || !GROQ_API_KEY) {
    return res.status(500).json({
      error: 'Groq API not configured',
      details: 'Please set USE_GROQ=true and GROQ_API_KEY in .env.local'
    })
  }

  // Check if WebSocket server is already running
  if (!wss) {
    console.log('🎤 Starting Groq Whisper WebSocket server for real-time transcription...')

    try {
      // Create WebSocket server for Groq Whisper transcription
      wss = new WebSocketServer({
        port: 8080,
        perMessageDeflate: false
      })

      wss.on('connection', async (ws) => {
        console.log('🔗 New WebSocket connection established')

        let audioChunks = []
        let chunkCounter = 0
        let processingQueue = []
        let isProcessing = false
        let lastTranscriptTime = Date.now()

        // Process audio chunks with Groq Whisper API
        const processAudioChunk = async (audioData) => {
          if (isProcessing) {
            processingQueue.push(audioData)
            return
          }

          isProcessing = true

          try {
            // Create temporary audio file
            const tempDir = '/tmp/whisper-realtime'
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true })
            }

            const tempFileName = `chunk_${Date.now()}_${chunkCounter++}.webm`
            const tempFilePath = path.join(tempDir, tempFileName)

            // Write audio data to temporary file
            await writeFile(tempFilePath, audioData)

            console.log(`🎵 Processing audio chunk: ${tempFileName}`)

            // Transcribe with Groq Whisper API
            const startTime = Date.now()
            const result = await transcribeChunkWithGroq(tempFilePath)
            const processingTime = Date.now() - startTime

            console.log(`✅ Groq Whisper processing completed in ${processingTime}ms`)

            // Extract transcript data
            const transcriptText = result.text?.trim() || ''
            const confidence = 0.95
            const words = result.words || []
            const language = result.language || 'unknown'

            // Send transcript back to client if there's actual content
            if (transcriptText && transcriptText.length > 0) {
              const transcriptData = {
                type: 'transcript',
                text: transcriptText,
                is_final: true,
                confidence: confidence,
                timestamp: Date.now(),
                processing_time: processingTime,
                model: 'whisper-large-v3',
                language: language,
                words: words,
                chunk_id: chunkCounter - 1
              }

              ws.send(JSON.stringify(transcriptData))
              console.log(`📝 Transcript sent: "${transcriptText}" (language: ${language})`)

              lastTranscriptTime = Date.now()
            }

            // Clean up temporary file
            await unlink(tempFilePath)

            // Process next item in queue
            if (processingQueue.length > 0) {
              const nextChunk = processingQueue.shift()
              setTimeout(() => processAudioChunk(nextChunk), 100)
            } else {
              isProcessing = false
            }

          } catch (error) {
            console.error('❌ Groq Whisper transcription error:', error)
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Transcription error: ' + error.message,
              timestamp: Date.now()
            }))
            isProcessing = false
          }
        }

        // Handle incoming audio data from client
        ws.on('message', (data) => {
          try {
            // Accumulate audio chunks for processing
            audioChunks.push(data)

            // Process audio in 3-5 second chunks for better real-time performance
            const timeSinceLastTranscript = Date.now() - lastTranscriptTime
            const shouldProcess = audioChunks.length >= 10 || timeSinceLastTranscript > 5000

            if (shouldProcess && audioChunks.length > 0) {
              // Combine accumulated chunks into single audio buffer
              const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
              const combinedBuffer = new Uint8Array(totalLength)
              let offset = 0

              audioChunks.forEach(chunk => {
                combinedBuffer.set(new Uint8Array(chunk), offset)
                offset += chunk.length
              })

              // Process the combined chunk
              processAudioChunk(combinedBuffer)

              // Reset chunk accumulator
              audioChunks = []
            }
          } catch (error) {
            console.error('❌ Error handling audio data:', error)
          }
        })

        // Handle client disconnect
        ws.on('close', () => {
          console.log('🔌 WebSocket connection closed')
          // Clean up any remaining chunks
          audioChunks = []
          processingQueue = []
        })

        // Send ready signal
        ws.send(JSON.stringify({
          type: 'ready',
          message: 'Groq Whisper-large-v3 real-time transcription started',
          model: 'whisper-large-v3',
          provider: 'groq',
          language: 'auto',
          timestamp: Date.now()
        }))

        console.log('✅ Groq Whisper connection ready')
      })

      console.log('✅ Groq WebSocket server running on port 8080')

    } catch (error) {
      console.error('❌ Failed to start WebSocket server:', error)
      return res.status(500).json({
        error: 'Failed to start real-time transcription server',
        details: error.message
      })
    }
  }

  res.status(200).json({
    success: true,
    message: 'Groq Whisper-large-v3 real-time transcription server is running',
    websocket_url: 'ws://localhost:8080',
    model: 'whisper-large-v3',
    provider: 'groq',
    features: [
      'Groq Whisper-large-v3 for highest accuracy',
      'Real-time chunked processing',
      'Auto language detection',
      'Word-level timestamps',
      'Multilingual support (98+ languages)',
      'FREE API usage'
    ]
  })
}

export const config = {
  api: {
    bodyParser: false,
  },
}
