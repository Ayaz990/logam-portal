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

    const { meetingId, chunkUrl, chunkIndex, isLastChunk, markCompleteOnly } = req.body

    if (!meetingId) {
      return res.status(400).json({
        error: 'Missing required field: meetingId'
      })
    }

    // Handle mark complete only request (no chunk to transcribe, just generate summary)
    if (markCompleteOnly && isLastChunk) {
      console.log(`🎯 Mark complete only request for meeting: ${meetingId}`)

      const meetingRef = doc(db, 'meetings', meetingId)
      const meetingSnap = await getDoc(meetingRef)

      if (!meetingSnap.exists()) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      const meetingData = meetingSnap.data()
      const currentTranscript = meetingData.transcript || {}
      const fullText = currentTranscript.text || ''

      if (!fullText) {
        console.log('⚠️ No transcript text found, skipping summary')
        await updateDoc(meetingRef, {
          'transcript.status': 'completed',
          'transcript.completedAt': new Date()
        })
        return res.status(200).json({
          success: true,
          message: 'Meeting marked as complete (no text to summarize)'
        })
      }

      // Generate summary
      console.log('🎯 Generating summary for completed meeting...')
      try {
        const groqApiKey = process.env.GROQ_API_KEY
        const detectedLanguage = currentTranscript.language || 'en'
        console.log(`🌍 Generating summary in detected language: ${detectedLanguage}`)

        const systemPrompt = detectedLanguage === 'en'
          ? 'You are a meeting summarizer. Create a concise, structured summary of the meeting transcript. Include key points, decisions, and action items.'
          : `You are a meeting summarizer. Create a concise, structured summary of the meeting transcript in the same language as the transcript (${detectedLanguage}). Include key points, decisions, and action items.`

        const summaryResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: `Summarize this meeting transcript:\n\n${fullText}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1500
          },
          {
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        const summary = summaryResponse.data.choices[0].message.content

        await updateDoc(meetingRef, {
          'transcript.summary': summary,
          'transcript.status': 'completed',
          'transcript.completedAt': new Date()
        })

        console.log('✅ Summary generated and meeting marked complete')

        return res.status(200).json({
          success: true,
          message: 'Meeting completed with summary',
          summaryLength: summary.length
        })
      } catch (summaryError) {
        console.error('❌ Summary generation failed:', summaryError.message)
        await updateDoc(meetingRef, {
          'transcript.status': 'completed',
          'transcript.summaryError': summaryError.message,
          'transcript.completedAt': new Date()
        })
        return res.status(200).json({
          success: true,
          message: 'Meeting marked complete (summary failed)'
        })
      }
    }

    if (!chunkUrl) {
      return res.status(400).json({
        error: 'Missing required field: chunkUrl'
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
    formData.append('model', 'whisper-large-v3-turbo') // Faster and more accurate
    // Don't specify language - let Whisper auto-detect for better multilingual support
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'word')
    formData.append('temperature', '0') // Lower temperature for better accuracy

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
        timeout: 180000, // 3 minutes for better processing
      }
    )

    const transcription = transcribeResponse.data
    const detectedLanguage = transcription.language || 'unknown'
    console.log('✅ Chunk transcribed successfully')
    console.log(`📊 Chunk text length: ${transcription.text?.length || 0} characters`)
    console.log(`🌍 Detected language: ${detectedLanguage}`)

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
        // Detect the primary language of the transcript
        const detectedLanguage = transcriptUpdate.language || 'en'
        console.log(`🌍 Generating summary in detected language: ${detectedLanguage}`)

        // Language-aware system prompt
        const systemPrompt = detectedLanguage === 'en'
          ? 'You are a meeting summarizer. Create a concise, structured summary of the meeting transcript. Include key points, decisions, and action items.'
          : `You are a meeting summarizer. Create a concise, structured summary of the meeting transcript in the same language as the transcript (${detectedLanguage}). Include key points, decisions, and action items.`

        // Generate summary using Groq with language awareness
        const summaryResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: `Summarize this meeting transcript:\n\n${fullText}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1500
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
