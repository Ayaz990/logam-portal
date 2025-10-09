import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'
import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'
import axios from 'axios'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Simple speaker detection based on audio patterns
function detectSpeakersFromSegments(segments) {
  if (!segments || segments.length === 0) return segments

  console.log('🎤 Detecting speakers from audio segments...')

  // Simple heuristic: Different speakers tend to have gaps between speaking turns
  // and different acoustic characteristics
  let currentSpeaker = 0
  const speakerSegments = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const prevSegment = i > 0 ? segments[i - 1] : null

    // If there's a significant gap (>2 seconds) or acoustic change, assume new speaker
    if (prevSegment) {
      const gap = segment.start - prevSegment.end
      const avgLogProbChange = Math.abs(
        (segment.avg_logprob || 0) - (prevSegment.avg_logprob || 0)
      )

      // New speaker if: long pause OR significant acoustic change
      if (gap > 2.0 || avgLogProbChange > 0.5) {
        currentSpeaker = (currentSpeaker + 1) % 4 // Max 4 speakers
      }
    }

    speakerSegments.push({
      ...segment,
      speaker: currentSpeaker
    })
  }

  console.log(`✅ Detected ${new Set(speakerSegments.map(s => s.speaker)).size} potential speakers`)
  return speakerSegments
}

// Transliterate Indian languages to Roman/Latin script (Hinglish)
async function transliterateToRoman(text, segments, language) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY

    if (!groqApiKey) {
      console.error('❌ No Groq API key found')
      throw new Error('Groq API key not available')
    }

    console.log(`🔄 Transliterating ${language} text (length: ${text.length})`)

    // Transliterate using Groq AI
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a transliteration expert. Convert ${language} text written in native script (Devanagari/Gurmukhi/etc) to Roman/Latin script (Hinglish/Romanized format). Keep proper nouns as-is. Maintain the exact same meaning and pronunciation. Only output the transliterated text, nothing else. Do not add explanations or quotes.`
          },
          {
            role: 'user',
            content: `Transliterate this ${language} text to Roman script:\n\n${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: Math.max(2000, text.length * 3)
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const transliteratedFullText = response.data.choices[0].message.content.trim()

    console.log(`✅ Full text transliterated successfully`)

    // Transliterate segments individually for better accuracy
    console.log(`🔄 Transliterating ${segments.length} segments...`)
    const transliteratedSegments = []
    for (const segment of segments) {
      if (segment.text && segment.text.trim()) {
        try {
          const segmentResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: 'llama-3.1-8b-instant', // Faster model for segments
              messages: [
                {
                  role: 'system',
                  content: `Convert ${language} text to Roman/Latin script. Output ONLY the transliterated text, nothing else.`
                },
                {
                  role: 'user',
                  content: segment.text
                }
              ],
              temperature: 0.1,
              max_tokens: Math.max(500, segment.text.length * 3)
            },
            {
              headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          )

          const transliteratedSegmentText = segmentResponse.data.choices[0].message.content.trim()

          transliteratedSegments.push({
            ...segment,
            text: transliteratedSegmentText,
            originalText: segment.text
          })
        } catch (error) {
          // If segment transliteration fails, keep original
          console.warn(`⚠️ Failed to transliterate segment: ${error.response?.status} - ${error.message}`)
          transliteratedSegments.push(segment)
        }
      } else {
        transliteratedSegments.push(segment)
      }
    }
    console.log(`✅ Segments transliteration completed`)

    return {
      text: transliteratedFullText,
      segments: transliteratedSegments
    }
  } catch (error) {
    console.error('Transliteration error:', error.message)
    throw error
  }
}

// Detect music and noise in segments
function detectMusicAndNoise(segments) {
  if (!segments || segments.length === 0) return { segments, hasMusic: false, hasNoise: false }

  console.log('🎵 Analyzing for music and background noise...')

  let hasMusic = false
  let hasNoise = false

  const enhancedSegments = segments.map(segment => {
    const text = segment.text?.toLowerCase() || ''
    const noSpeechProb = segment.no_speech_prob || 0

    // Music detection: High no_speech_prob + repetitive patterns
    const isMusicLikely = noSpeechProb > 0.5 ||
                          text.includes('[music]') ||
                          text.includes('♪') ||
                          (segment.compression_ratio && segment.compression_ratio < 1.5)

    // Noise detection: High no_speech_prob + low compression
    const isNoiseLikely = noSpeechProb > 0.3 &&
                          noSpeechProb < 0.6 &&
                          text.length < 10

    if (isMusicLikely) {
      hasMusic = true
      console.log(`🎵 Music detected at ${segment.start}s`)
    }

    if (isNoiseLikely) {
      hasNoise = true
      console.log(`📢 Background noise detected at ${segment.start}s`)
    }

    return {
      ...segment,
      isMusic: isMusicLikely,
      isNoise: isNoiseLikely,
      quality: noSpeechProb < 0.2 ? 'clear' : noSpeechProb < 0.5 ? 'moderate' : 'poor'
    }
  })

  return {
    segments: enhancedSegments,
    hasMusic,
    hasNoise
  }
}

// Whisper API function (supports OpenAI and Groq)
async function transcribeWithWhisperAPI(audioFilePath, options = {}) {
  try {
    // Check which API to use
    const useGroq = process.env.USE_GROQ === 'true'
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions'

    // Model selection
    const model = useGroq
      ? 'whisper-large-v3'  // Groq's free Whisper large v3 model
      : 'whisper-1'          // OpenAI's whisper-1

    const formData = new FormData()

    // Create read stream with proper filename
    const fileStream = fs.createReadStream(audioFilePath)
    formData.append('file', fileStream, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    })

    formData.append('model', model)

    // Only add language if specified and not 'auto'
    if (options.language && options.language !== 'auto') {
      formData.append('language', options.language)
    }

    // Response format - verbose_json gives us detailed segment info
    formData.append('response_format', 'verbose_json')

    // Temperature for consistency
    formData.append('temperature', '0')

    console.log(`🎙️ Sending audio to ${useGroq ? 'Groq' : 'OpenAI'} Whisper API...`)
    console.log(`📦 Using model: ${model}`)

    // Use axios for better FormData handling
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    console.log(`✅ ${useGroq ? 'Groq' : 'OpenAI'} Whisper API transcription completed`)

    const result = response.data

    // Detect speakers, music, and noise
    const speakerSegments = detectSpeakersFromSegments(result.segments || [])
    const { segments: enhancedSegments, hasMusic, hasNoise } = detectMusicAndNoise(speakerSegments)

    // Transliterate Hindi/Gujarati/Urdu to Hinglish/Roman script if needed
    const needsTransliteration = ['Hindi', 'Gujarati', 'Punjabi', 'Marathi', 'Bengali', 'Tamil', 'Telugu', 'Urdu', 'Arabic', 'Persian'].includes(result.language)

    let transliteratedText = result.text
    let transliteratedSegments = enhancedSegments

    if (needsTransliteration && useGroq) {
      console.log(`🔄 Converting ${result.language} to Hinglish/Roman script...`)
      try {
        const transliterationResult = await transliterateToRoman(result.text, enhancedSegments, result.language)
        transliteratedText = transliterationResult.text
        transliteratedSegments = transliterationResult.segments
        console.log('✅ Transliteration completed')
        console.log('📝 Transliterated text preview:', transliteratedText.substring(0, 100))
      } catch (error) {
        console.error('❌ Transliteration failed:', error.message)
        if (error.response) {
          console.error('API Response Status:', error.response.status)
          console.error('API Response Data:', JSON.stringify(error.response.data, null, 2))
        }
        // Keep original text if transliteration fails
        console.warn('⚠️ Using original text due to transliteration failure')
      }
    }

    return {
      text: transliteratedText,
      originalText: needsTransliteration ? result.text : undefined, // Keep original for reference
      confidence: 0.95,
      duration: result.duration,
      language: result.language,
      displayLanguage: needsTransliteration ? `${result.language} (Romanized)` : result.language,
      segments: transliteratedSegments,
      words: result.words || [],
      method: useGroq ? 'groq_whisper_api' : 'openai_whisper_api',
      model: model,
      audioAnalysis: {
        hasMusic,
        hasNoise,
        speakerCount: new Set(enhancedSegments.map(s => s.speaker)).size,
        quality: hasNoise ? 'noisy' : 'clear'
      }
    }
  } catch (error) {
    console.error('❌ Whisper API error:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || error.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Check if request has meetingId in body (from trigger-transcribe)
    if (req.headers['content-type']?.includes('application/json')) {
      // Manually parse JSON body (bodyParser is disabled for FormData support)
      const rawBody = await new Promise((resolve, reject) => {
        let data = ''
        req.on('data', chunk => { data += chunk })
        req.on('end', () => resolve(data))
        req.on('error', reject)
      })

      const body = JSON.parse(rawBody)
      const { meetingId, videoUrl, mimeType } = body

      if (!meetingId) {
        return res.status(400).json({ error: 'Meeting ID is required' })
      }

      console.log('🎤 Transcribe request for meeting:', meetingId)

      // Get meeting data and download video
      const meetingRef = doc(db, 'meetings', meetingId)
      const meetingSnap = await require('firebase/firestore').getDoc(meetingRef)

      if (!meetingSnap.exists()) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      const meetingData = meetingSnap.data()

      // Download video from Firebase Storage
      console.log('📥 Downloading video from:', meetingData.videoUrl)
      const videoResponse = await fetch(meetingData.videoUrl)
      if (!videoResponse.ok) {
        throw new Error('Failed to download video')
      }

      const videoBuffer = await videoResponse.arrayBuffer()
      console.log(`✅ Video downloaded: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`)

      // Save to temp file
      const tempPath = `/tmp/recording-${Date.now()}.webm`
      fs.writeFileSync(tempPath, Buffer.from(videoBuffer))

      // Process this temp file
      const audioFile = {
        filepath: tempPath,
        size: videoBuffer.byteLength,
        mimetype: meetingData.mimeType || 'video/webm',
        originalFilename: 'recording.webm'
      }

      // Continue with normal transcription flow...
      await processTranscription(audioFile, meetingId, res)
      return
    }

    // Original file upload flow
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

    await processTranscription(audioFile, meetingId, res)

  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

async function processTranscription(audioFile, meetingId, res) {
  try {

    // Update meeting status to processing
    const meetingRef = doc(db, 'meetings', meetingId)
    await updateDoc(meetingRef, {
      'transcript.status': 'processing',
      'transcript.startedAt': new Date()
    })

    // Read and preprocess the audio file for better accuracy
    const audioBuffer = fs.readFileSync(audioFile.filepath)

    console.log(`🎵 Processing audio file: ${audioFile.originalFilename}`)
    console.log(`📊 File size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`🎧 MIME type: ${audioFile.mimetype}`)

    // Log audio info for debugging
    if (audioFile.size < 1024) {
      console.warn('⚠️ Audio file is very small, may affect accuracy')
    }

    if (audioFile.size > 100 * 1024 * 1024) {
      console.warn('⚠️ Audio file is large, processing may take longer')
    }

    // Transcribe with OpenAI Whisper API
    console.log('🎙️ Starting Whisper API transcription...')
    console.log(`📁 Audio file path: ${audioFile.filepath}`)
    console.log(`📊 Audio file size: ${audioFile.size} bytes`)

    const whisperOptions = {
      language: 'auto'     // Auto-detect language
    }

    let result
    try {
      console.log('🔄 Calling Whisper API with options:', JSON.stringify(whisperOptions, null, 2))

      // Use Whisper API
      result = await transcribeWithWhisperAPI(audioFile.filepath, whisperOptions)

      console.log('✅ Whisper API transcription completed successfully')
      console.log('📋 Raw result type:', typeof result)
      console.log('📋 Raw result:', result)

      // Handle different result formats
      if (typeof result === 'string') {
        console.log('📝 Result is string, attempting to parse as JSON...')
        try {
          result = JSON.parse(result)
        } catch (parseError) {
          console.log('⚠️ Failed to parse result as JSON, treating as plain text')
          result = { text: result }
        }
      }

      // Log a sample of the result for debugging
      if (result) {
        console.log('📝 Result preview:', {
          hasText: !!result.text,
          hasSegments: !!result.segments,
          segmentCount: result.segments?.length || 0,
          textPreview: result.text?.substring(0, 100) || 'No text',
          allKeys: Object.keys(result)
        })
      }

    } catch (error) {
      console.error('❌ Whisper transcription error:', error)
      console.error('🔍 Error details:', {
        message: error.message,
        stack: error.stack?.split('\n')[0],
        filepath: audioFile.filepath,
        fileExists: require('fs').existsSync(audioFile.filepath)
      })

      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': error.message || 'Whisper API transcription error',
        'transcript.processedAt': new Date()
      })
      return res.status(500).json({
        error: 'Whisper API transcription failed',
        details: error.message
      })
    }

    // Extract transcript data from Whisper format
    if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
      console.log('❌ Whisper returned empty or null result')

      // Whisper API returned no data
      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': 'Whisper API transcription returned no data',
        'transcript.processedAt': new Date()
      })
      return res.status(500).json({
        error: 'No transcript data',
        details: 'Whisper API failed to generate transcript'
      })
    }

    // Ensure we have at least some text
    if (!result.text && !result.segments) {
      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': 'No transcript text returned from Whisper',
        'transcript.processedAt': new Date()
      })
      return res.status(500).json({ error: 'No transcript data' })
    }

    // Prepare transcript data for storage (Whisper format with speaker info)
    const transcriptData = {
      text: result.text || '',
      confidence: 0.9,
      words: result.words?.map(word => ({
        word: word.word || '',
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.probability || 0.9,
        speaker: 0
      })) || [],
      paragraphs: [], // We'll generate paragraphs from segments
      segments: result.segments?.map(segment => ({
        text: segment.text || '',
        start: segment.start || 0,
        end: segment.end || 0,
        speaker: segment.speaker || 0,  // Include speaker info
        isMusic: segment.isMusic || false,
        isNoise: segment.isNoise || false,
        quality: segment.quality || 'clear',
        words: segment.words?.map(word => ({
          word: word.word || '',
          start: word.start || 0,
          end: word.end || 0,
          confidence: word.probability || 0.9
        })) || []
      })) || [],
      // Group segments by speaker for utterances
      utterances: [], // Will be populated below
      metadata: {
        duration: result.duration || 0,
        channels: 1,
        created: new Date().toISOString(),
        model_info: {
          name: result.model || 'whisper-large-v3',
          language: result.language || whisperOptions.language,
          version: result.method || 'groq_whisper_api'
        },
        audioAnalysis: result.audioAnalysis || {
          hasMusic: false,
          hasNoise: false,
          speakerCount: 1,
          quality: 'clear'
        }
      }
    }

    // Generate utterances (speaker-separated segments)
    if (result.segments && result.segments.length > 0) {
      const utterances = []
      let currentUtterance = null

      for (const segment of result.segments) {
        const speaker = segment.speaker || 0

        // If same speaker continues, merge into current utterance
        if (currentUtterance && currentUtterance.speaker === speaker) {
          currentUtterance.text += ' ' + segment.text
          currentUtterance.end = segment.end
        } else {
          // New speaker, save previous and start new
          if (currentUtterance) {
            utterances.push(currentUtterance)
          }
          currentUtterance = {
            speaker,
            text: segment.text,
            start: segment.start,
            end: segment.end,
            confidence: 0.9
          }
        }
      }

      // Add last utterance
      if (currentUtterance) {
        utterances.push(currentUtterance)
      }

      transcriptData.utterances = utterances
      console.log(`👥 Generated ${utterances.length} utterances from ${result.audioAnalysis?.speakerCount || 1} speakers`)
    }

    // Generate paragraphs from segments (group by silence gaps)
    if (result.segments && result.segments.length > 0) {
      const paragraphs = []
      let currentParagraph = {
        text: '',
        start: result.segments[0].start,
        end: result.segments[0].end,
        sentences: []
      }

      for (let i = 0; i < result.segments.length; i++) {
        const segment = result.segments[i]
        const nextSegment = result.segments[i + 1]

        // Add segment to current paragraph
        currentParagraph.text += (currentParagraph.text ? ' ' : '') + segment.text
        currentParagraph.end = segment.end
        currentParagraph.sentences.push({
          text: segment.text,
          start: segment.start,
          end: segment.end
        })

        // If there's a long gap (>2 seconds) or it's the last segment, start new paragraph
        if (!nextSegment || (nextSegment.start - segment.end > 2.0)) {
          paragraphs.push(currentParagraph)
          if (nextSegment) {
            currentParagraph = {
              text: '',
              start: nextSegment.start,
              end: nextSegment.end,
              sentences: []
            }
          }
        }
      }

      transcriptData.paragraphs = paragraphs
    }

    // Validate transcript data before saving
    console.log('📝 Transcript data summary:')
    console.log(`- Text length: ${transcriptData.text?.length || 0} characters`)
    console.log(`- Words count: ${transcriptData.words?.length || 0}`)
    console.log(`- Segments count: ${transcriptData.segments?.length || 0}`)
    console.log(`- Paragraphs count: ${transcriptData.paragraphs?.length || 0}`)
    console.log(`- Model: ${transcriptData.metadata?.model_info?.name || 'unknown'}`)

    // Create clean data object for Firebase (no undefined values)
    const cleanTranscriptData = {
      text: transcriptData.text || '',
      confidence: transcriptData.confidence || 0,
      words: transcriptData.words || [],
      paragraphs: transcriptData.paragraphs || [],
      segments: transcriptData.segments || [], // Whisper segments instead of utterances
      metadata: transcriptData.metadata || {},
      status: 'completed',
      processedAt: new Date()
    }

    // Update Firebase with transcript
    await updateDoc(meetingRef, {
      transcript: cleanTranscriptData
    })

    console.log('💾 Transcript saved to Firebase successfully')

    // Generate automatic summary
    console.log('🤖 Generating automatic meeting summary...')
    try {
      const summaryResponse = await fetch(`${getBaseUrl()}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET
        },
        body: JSON.stringify({ transcript: transcriptData })
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()

        // Save summary to Firebase
        await updateDoc(meetingRef, {
          summary: {
            ...summaryData,
            status: 'completed',
            generatedAt: new Date()
          }
        })
        console.log('✅ Meeting summary generated and saved automatically')
      } else {
        console.warn('⚠️ Failed to generate automatic summary')
        await updateDoc(meetingRef, {
          summary: {
            status: 'failed',
            error: 'Summary generation failed',
            generatedAt: new Date()
          }
        })
      }
    } catch (summaryError) {
      console.error('Summary generation error:', summaryError)
      await updateDoc(meetingRef, {
        summary: {
          status: 'failed',
          error: summaryError.message,
          generatedAt: new Date()
        }
      })
    }

    // Clean up temporary file
    fs.unlinkSync(audioFile.filepath)

    res.status(200).json({
      success: true,
      transcript: transcriptData,
      message: 'Transcript generated successfully'
    })

  } catch (error) {
    console.error('processTranscription error:', error)
    throw error
  }
}