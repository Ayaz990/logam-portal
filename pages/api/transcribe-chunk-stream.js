import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import axios from 'axios'

export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 300, // 5 minutes for chunk processing
}

/**
 * Real-time chunk transcription
 * Transcribes audio chunks as they arrive during recording
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🎤 Real-time chunk transcription request')

    const { meetingId, chunkUrl, chunkIndex, isLastChunk } = req.body

    if (!meetingId || !chunkUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['meetingId', 'chunkUrl']
      })
    }

    console.log(`📝 Processing chunk ${chunkIndex} for meeting: ${meetingId}`)
    console.log(`🔗 Chunk URL: ${chunkUrl}`)
    console.log(`🏁 Is last chunk: ${isLastChunk}`)

    // Check if meeting exists
    const meetingRef = doc(db, 'meetings', meetingId)
    const meetingSnap = await getDoc(meetingRef)

    if (!meetingSnap.exists()) {
      return res.status(404).json({ error: 'Meeting not found' })
    }

    const meetingData = meetingSnap.data()

    // Download chunk from Firebase
    console.log('📥 Downloading chunk from Firebase...')
    const videoResponse = await axios.get(chunkUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 1 minute timeout
      maxContentLength: 500 * 1024 * 1024, // 500MB max
    })

    const videoBuffer = Buffer.from(videoResponse.data)
    console.log(`📦 Chunk downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`)

    // Transcribe using Groq Whisper API
    const groqApiKey = process.env.GROQ_API_KEY
    const useGroq = process.env.USE_GROQ === 'true'

    if (!groqApiKey || !useGroq) {
      throw new Error('Groq API not configured')
    }

    console.log('🎙️ Sending chunk to Groq Whisper API...')

    const FormData = require('form-data')
    const formData = new FormData()
    formData.append('file', videoBuffer, {
      filename: `chunk-${chunkIndex}.webm`,
      contentType: 'video/webm'
    })
    formData.append('model', 'whisper-large-v3')
    formData.append('language', 'en') // Auto-detect or specify
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')

    const transcribeResponse = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000, // 2 minutes
      }
    )

    const transcription = transcribeResponse.data
    console.log('✅ Chunk transcribed successfully')
    console.log(`📊 Chunk text length: ${transcription.text?.length || 0} characters`)

    // Get existing transcript data
    const currentTranscript = meetingData.transcript || {
      status: 'processing',
      text: '',
      words: [],
      chunks: [],
      confidence: null
    }

    // Append this chunk's transcription
    const updatedChunks = [
      ...(currentTranscript.chunks || []),
      {
        index: chunkIndex,
        text: transcription.text,
        words: transcription.words || [],
        duration: transcription.duration,
        language: transcription.language,
        timestamp: new Date().toISOString()
      }
    ]

    // Combine all text
    const fullText = updatedChunks.map(c => c.text).join(' ')
    const allWords = updatedChunks.flatMap(c => c.words || [])

    // Calculate average confidence
    const confidenceValues = allWords
      .map(w => w.confidence)
      .filter(c => c !== undefined && c !== null)
    const avgConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : null

    // Update Firestore with partial transcript
    const transcriptUpdate = {
      status: isLastChunk ? 'completed' : 'processing',
      text: fullText,
      words: allWords,
      chunks: updatedChunks,
      confidence: avgConfidence,
      language: transcription.language || 'en',
      processedAt: new Date(),
      lastChunkIndex: chunkIndex,
      isRealtime: true
    }

    console.log('💾 Updating Firestore with partial transcript...')
    await updateDoc(meetingRef, {
      transcript: transcriptUpdate,
      'transcript.updatedAt': new Date()
    })

    console.log(`✅ Transcript updated (chunk ${chunkIndex})`)

    // If this is the last chunk, generate summary
    if (isLastChunk) {
      console.log('🎯 Last chunk - generating summary...')

      try {
        // Generate summary using Groq
        const summaryResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-70b-versatile',
            messages: [
              {
                role: 'system',
                content: 'You are a meeting summarizer. Create a concise, structured summary of the meeting transcript. Include key points, decisions, and action items.'
              },
              {
                role: 'user',
                content: `Summarize this meeting transcript:\n\n${fullText}`
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          },
          {
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        const summary = summaryResponse.data.choices[0].message.content

        console.log('✅ Summary generated')
        console.log(`📝 Summary length: ${summary.length} characters`)

        // Update with summary
        await updateDoc(meetingRef, {
          'transcript.summary': summary,
          'transcript.status': 'completed',
          'transcript.completedAt': new Date()
        })

        console.log('✅ Meeting fully transcribed and summarized!')

      } catch (summaryError) {
        console.error('❌ Summary generation failed:', summaryError.message)
        // Don't fail the whole request if summary fails
        await updateDoc(meetingRef, {
          'transcript.status': 'completed',
          'transcript.summaryError': summaryError.message
        })
      }
    }

    return res.status(200).json({
      success: true,
      chunkIndex,
      transcriptLength: fullText.length,
      wordsCount: allWords.length,
      isLastChunk,
      confidence: avgConfidence,
      message: isLastChunk
        ? 'Transcription completed with summary'
        : 'Chunk transcribed, awaiting more chunks'
    })

  } catch (error) {
    console.error('❌ Chunk transcription error:', error)

    // Try to update meeting status with error
    try {
      const { meetingId } = req.body
      if (meetingId) {
        const meetingRef = doc(db, 'meetings', meetingId)
        await updateDoc(meetingRef, {
          'transcript.status': 'error',
          'transcript.error': error.message,
          'transcript.errorAt': new Date()
        })
      }
    } catch (updateError) {
      console.error('❌ Failed to update error status:', updateError)
    }

    return res.status(500).json({
      error: 'Chunk transcription failed',
      details: error.message
    })
  }
}
