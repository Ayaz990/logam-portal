/**
 * Real-Time Transcription Server using Deepgram Streaming API
 *
 * This is how Fireflies, tldv, and other services do real-time transcription.
 * Deepgram's streaming API is specifically designed for this use case.
 */

const WebSocket = require('ws')
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk')
require('dotenv').config({ path: '.env.local' })

const PORT = process.env.PORT || 8080
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not found in environment variables')
  console.error('Please set DEEPGRAM_API_KEY in Railway')
  process.exit(1)
}

console.log('🎤 Starting Deepgram real-time transcription server...')
console.log('📡 This is how Fireflies and tldv do it!')

// Create WebSocket server for clients
const wss = new WebSocket.Server({
  port: PORT,
  perMessageDeflate: false
})

wss.on('connection', (clientWs) => {
  console.log('🔗 New client connected')

  // Create Deepgram client for this connection
  const deepgram = createClient(DEEPGRAM_API_KEY)

  // Connect to Deepgram's streaming API
  const dgConnection = deepgram.listen.live({
    model: 'nova-2',           // Best accuracy
    language: 'en',
    smart_format: true,         // Auto punctuation and formatting
    interim_results: true,      // Get results as user speaks
    punctuate: true,
    diarize: false,
    filler_words: false,
    utterance_end_ms: 1000
  })

  // Deepgram connection opened
  dgConnection.on(LiveTranscriptionEvents.Open, () => {
    console.log('✅ Deepgram streaming connection opened')

    // Tell client we're ready
    clientWs.send(JSON.stringify({
      type: 'ready',
      message: 'Deepgram real-time transcription ready',
      model: 'nova-2',
      provider: 'deepgram',
      timestamp: Date.now()
    }))
  })

  // Transcription results from Deepgram (REAL-TIME!)
  dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript

    if (transcript && transcript.length > 0) {
      const isFinal = data.is_final
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0

      console.log(`📝 ${isFinal ? 'FINAL' : 'interim'}: "${transcript}" (${Math.round(confidence * 100)}%)`)

      // Send transcript to client immediately
      clientWs.send(JSON.stringify({
        type: 'transcript',
        text: transcript,
        is_final: isFinal,
        confidence: confidence,
        timestamp: Date.now(),
        model: 'nova-2',
        provider: 'deepgram'
      }))
    }
  })

  // Deepgram errors
  dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('❌ Deepgram error:', error)
    clientWs.send(JSON.stringify({
      type: 'error',
      message: 'Transcription error: ' + error.message,
      timestamp: Date.now()
    }))
  })

  // Deepgram connection closed
  dgConnection.on(LiveTranscriptionEvents.Close, () => {
    console.log('🔌 Deepgram connection closed')
  })

  // Metadata from Deepgram
  dgConnection.on(LiveTranscriptionEvents.Metadata, (data) => {
    console.log('📊 Deepgram metadata:', data)
  })

  // Handle incoming audio from client browser
  clientWs.on('message', (audioData) => {
    try {
      // Forward audio chunks directly to Deepgram's streaming API
      // This is the key difference from Groq - Deepgram handles raw streams!
      if (dgConnection.getReadyState() === 1) {
        dgConnection.send(audioData)
      }
    } catch (error) {
      console.error('❌ Error forwarding audio to Deepgram:', error)
    }
  })

  // Client disconnected
  clientWs.on('close', () => {
    console.log('🔌 Client disconnected')
    dgConnection.finish()
  })

  // Client errors
  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error)
    dgConnection.finish()
  })
})

wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error)
})

console.log(`✅ Server running on ws://localhost:${PORT}`)
console.log('🎤 Deepgram Nova-2 ready for INSTANT transcription')
console.log('📡 Same technology as Fireflies and tldv!')
console.log('⚡ Waiting for connections...')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...')
  wss.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
