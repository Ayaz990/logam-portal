/**
 * Standalone WebSocket Server for Real-Time Transcription
 *
 * This server runs separately from Next.js and provides real-time transcription
 * using Groq's Whisper API.
 *
 * Usage:
 *   node transcription-server.js
 *
 * Environment Variables Required:
 *   - GROQ_API_KEY: Your Groq API key
 *
 * The server will run on ws://localhost:8080
 */

const WebSocket = require('ws')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')
require('dotenv').config({ path: '.env.local' })

const PORT = process.env.PORT || 8080
const GROQ_API_KEY = process.env.GROQ_API_KEY

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found in environment variables')
  console.error('Please set GROQ_API_KEY in .env.local file')
  process.exit(1)
}

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
    console.error('❌ Groq API error:', error.response?.data || error.message)
    throw error
  }
}

// Create WebSocket server
console.log('🎤 Starting Groq Whisper WebSocket server...')

const wss = new WebSocket.Server({
  port: PORT,
  perMessageDeflate: false
})

wss.on('connection', (ws) => {
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
      const tempDir = path.join(__dirname, 'tmp', 'whisper-realtime')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const tempFileName = `chunk_${Date.now()}_${chunkCounter++}.webm`
      const tempFilePath = path.join(tempDir, tempFileName)

      // Write audio data to temporary file
      await fs.promises.writeFile(tempFilePath, audioData)

      console.log(`🎵 Processing audio chunk: ${tempFileName} (${audioData.length} bytes)`)

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
      await fs.promises.unlink(tempFilePath)

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

      // Calculate total size of accumulated chunks
      const totalSize = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)

      // Process audio in larger chunks (minimum 100KB or 10 seconds)
      // This ensures we send complete, valid audio files to Groq
      const timeSinceLastTranscript = Date.now() - lastTranscriptTime
      const shouldProcess = (totalSize >= 100000 && audioChunks.length >= 5) || timeSinceLastTranscript > 10000

      if (shouldProcess && audioChunks.length > 0 && totalSize >= 50000) {
        // Combine accumulated chunks into single audio buffer
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combinedBuffer = Buffer.alloc(totalLength)
        let offset = 0

        audioChunks.forEach(chunk => {
          combinedBuffer.set(chunk, offset)
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

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
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

wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error)
})

console.log(`✅ WebSocket server running on ws://localhost:${PORT}`)
console.log('🎤 Groq Whisper-large-v3 ready for real-time transcription')
console.log('📡 Waiting for connections...')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...')
  wss.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
