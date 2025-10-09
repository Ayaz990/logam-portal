// import { createClient } from '@deepgram/sdk'  // Commented out - now using local Whisper
import { whisper } from 'whisper-node'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getBaseUrl } from '@/lib/getBaseUrl'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Language detection patterns
const LANGUAGE_PATTERNS = {
  gujarati: /[\u0A80-\u0AFF]/,  // Gujarati Unicode range
  hindi: /[\u0900-\u097F]/,     // Hindi/Devanagari Unicode range
  english: /^[a-zA-Z\s\d\.,!?'"()-]+$/,
  hinglish: /(acha|theek|hai|kya|haan|nahi|yaar|bhai|didi|uncle|aunty|namaste)/i
}

// Available models with performance on M4 Mac
const WHISPER_MODELS = {
  'tiny': { size: '39MB', speed: '~10x realtime', languages: 'all' },
  'base': { size: '74MB', speed: '~5x realtime', languages: 'all' },
  'small': { size: '244MB', speed: '~2x realtime', languages: 'all' },
  'tiny.en': { size: '39MB', speed: '~15x realtime', languages: 'english only' },
  'base.en': { size: '74MB', speed: '~8x realtime', languages: 'english only' }
}

function detectLanguage(text) {
  if (!text) return 'auto'

  const hasGujarati = LANGUAGE_PATTERNS.gujarati.test(text)
  const hasHindi = LANGUAGE_PATTERNS.hindi.test(text)
  const hasHinglish = LANGUAGE_PATTERNS.hinglish.test(text)
  const isEnglish = LANGUAGE_PATTERNS.english.test(text)

  if (hasGujarati) return 'gu'
  if (hasHindi) return 'hi'
  if (hasHinglish && isEnglish) return 'hi' // Treat Hinglish as Hindi
  if (isEnglish) return 'en'

  return 'auto' // Let Whisper auto-detect
}

function selectOptimalModel(language = 'auto', priority = 'balanced') {
  // For M4 Mac - optimize for speed and accuracy
  const modelMap = {
    'en': {
      'speed': 'tiny.en',
      'balanced': 'base.en',
      'accuracy': 'base.en'
    },
    'hi': {
      'speed': 'tiny',
      'balanced': 'base',
      'accuracy': 'small'
    },
    'gu': {
      'speed': 'tiny',
      'balanced': 'base',
      'accuracy': 'small'
    },
    'auto': {
      'speed': 'tiny',
      'balanced': 'base',
      'accuracy': 'small'
    }
  }

  return modelMap[language]?.[priority] || 'base'
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
    const preferredLanguage = fields.language?.[0] || 'auto'
    const priority = fields.priority?.[0] || 'balanced' // speed, balanced, accuracy

    if (!audioFile || !meetingId) {
      return res.status(400).json({ error: 'Audio file and meeting ID are required' })
    }

    // Update meeting status to processing
    const meetingRef = doc(db, 'meetings', meetingId)
    await updateDoc(meetingRef, {
      'transcript.status': 'processing',
      'transcript.startedAt': new Date(),
      'transcript.language': preferredLanguage,
      'transcript.priority': priority
    })

    console.log(`🎵 Processing audio file: ${audioFile.originalFilename}`)
    console.log(`📊 File size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`)
    console.log(`🌍 Preferred language: ${preferredLanguage}`)
    console.log(`⚡ Priority: ${priority}`)

    // Select optimal model for M4 Mac
    const selectedModel = selectOptimalModel(preferredLanguage, priority)
    console.log(`🤖 Selected model: ${selectedModel} (${WHISPER_MODELS[selectedModel]?.speed} on M4)`)

    // Transcribe with local Whisper
    console.log('🎙️ Starting local Whisper transcription...')

    const whisperOptions = {
      modelName: selectedModel,
      whisperOptions: {
        language: preferredLanguage === 'auto' ? undefined : preferredLanguage,
        task: 'transcribe',
        output_format: 'json',
        word_timestamps: true,
        // M4 Mac optimizations
        threads: 8, // M4 has excellent multi-threading
        processors: 1,
        fp16: true, // M4 supports fp16 well
        // Enhanced for multilingual
        suppress_blank: true,
        suppress_non_speech_tokens: true,
        temperature: 0.0, // More deterministic for consistent results
      }
    }

    let result
    const startTime = Date.now()

    try {
      console.log('🔄 Calling Whisper with options:', JSON.stringify(whisperOptions, null, 2))
      result = await whisper(audioFile.filepath, whisperOptions)

      const processingTime = Date.now() - startTime
      const speedRatio = (result.duration || 1) / (processingTime / 1000)

      console.log('✅ Local Whisper transcription completed successfully')
      console.log(`⏱️ Processing time: ${processingTime}ms`)
      console.log(`🚀 Speed ratio: ${speedRatio.toFixed(1)}x realtime`)
      console.log('📋 Result structure:', Object.keys(result || {}))

    } catch (error) {
      console.error('❌ Whisper transcription error:', error)
      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': error.message || 'Local transcription service error',
        'transcript.processedAt': new Date()
      })
      return res.status(500).json({
        error: 'Local transcription failed',
        details: error.message,
        model: selectedModel
      })
    }

    // Extract transcript data from Whisper format
    if (!result || (!result.text && !result.segments)) {
      await updateDoc(meetingRef, {
        'transcript.status': 'failed',
        'transcript.error': 'No transcript data returned from Whisper',
        'transcript.processedAt': new Date()
      })
      return res.status(500).json({ error: 'No transcript data' })
    }

    // Detect actual language from transcribed text
    const detectedLanguage = detectLanguage(result.text)
    console.log(`🌍 Detected language: ${detectedLanguage}`)

    // Prepare transcript data for storage (Whisper format)
    const transcriptData = {
      text: result.text || '',
      confidence: result.segments?.reduce((avg, seg) => avg + (seg.avg_logprob || 0), 0) / (result.segments?.length || 1) || 0.9,
      language: {
        requested: preferredLanguage,
        detected: detectedLanguage,
        whisper_detected: result.language || 'unknown'
      },
      words: result.words?.map(word => ({
        word: word.word || '',
        start: word.start || 0,
        end: word.end || 0,
        confidence: word.probability || 0.9,
        speaker: 0
      })) || [],
      segments: result.segments?.map(segment => ({
        text: segment.text || '',
        start: segment.start || 0,
        end: segment.end || 0,
        avg_logprob: segment.avg_logprob || 0,
        words: segment.words?.map(word => ({
          word: word.word || '',
          start: word.start || 0,
          end: word.end || 0,
          confidence: word.probability || 0.9
        })) || []
      })) || [],
      metadata: {
        duration: result.duration || 0,
        model: selectedModel,
        model_info: WHISPER_MODELS[selectedModel],
        processing_time: Date.now() - startTime,
        created: new Date().toISOString(),
        platform: 'M4 Mac',
        version: 'whisper-local-multilingual'
      }
    }

    // Generate paragraphs from segments with language awareness
    if (result.segments && result.segments.length > 0) {
      const paragraphs = []
      let currentParagraph = {
        text: '',
        start: result.segments[0].start,
        end: result.segments[0].end,
        sentences: [],
        language: detectedLanguage
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

        // For multilingual content, break paragraphs more frequently
        const pauseThreshold = ['hi', 'gu'].includes(detectedLanguage) ? 1.5 : 2.0

        if (!nextSegment || (nextSegment.start - segment.end > pauseThreshold)) {
          paragraphs.push(currentParagraph)
          if (nextSegment) {
            currentParagraph = {
              text: '',
              start: nextSegment.start,
              end: nextSegment.end,
              sentences: [],
              language: detectedLanguage
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
    console.log(`- Language: ${detectedLanguage} (requested: ${preferredLanguage})`)
    console.log(`- Model: ${selectedModel}`)

    // Create clean data object for Firebase
    const cleanTranscriptData = {
      text: transcriptData.text || '',
      confidence: transcriptData.confidence || 0,
      language: transcriptData.language || {},
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

    // Generate automatic summary (language-aware)
    console.log('🤖 Generating automatic meeting summary...')
    try {
      const summaryResponse = await fetch(`${getBaseUrl()}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptData,
          language: detectedLanguage
        })
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        await updateDoc(meetingRef, {
          summary: {
            ...summaryData,
            language: detectedLanguage,
            status: 'completed',
            generatedAt: new Date()
          }
        })
        console.log('✅ Meeting summary generated and saved automatically')
      }
    } catch (summaryError) {
      console.error('Summary generation error:', summaryError)
    }

    // Clean up temporary file
    fs.unlinkSync(audioFile.filepath)

    res.status(200).json({
      success: true,
      transcript: transcriptData,
      message: `Transcript generated successfully in ${detectedLanguage}`,
      performance: {
        model: selectedModel,
        processing_time: transcriptData.metadata.processing_time,
        language_detected: detectedLanguage
      }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}