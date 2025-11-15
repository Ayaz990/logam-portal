import axios from 'axios'

// Format timestamp from seconds to MM:SS
function formatTimestamp(seconds) {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Build enhanced transcript with timestamps
function buildTranscriptWithTimestamps(transcript) {
  const segments = transcript.segments || []
  if (segments.length === 0) {
    return transcript.text || ''
  }

  // Create transcript with timestamps
  let enhancedText = ''
  segments.forEach(segment => {
    const timestamp = formatTimestamp(segment.start)
    enhancedText += `[${timestamp}] ${segment.text}\n`
  })

  return enhancedText
}

// Groq API for AI summarization
async function generateAISummary(text, transcript) {
  try {
    const useGroq = process.env.USE_GROQ === 'true'
    const groqApiKey = process.env.GROQ_API_KEY

    console.log('🔍 Groq config check:', { useGroq, hasApiKey: !!groqApiKey })

    if (!useGroq || !groqApiKey) {
      console.warn('⚠️ Groq not configured, falling back to simple summarization')
      return null // Fall back to simple summarization
    }

    // Build transcript with timestamps if available
    const transcriptWithTimestamps = buildTranscriptWithTimestamps(transcript)
    const textToAnalyze = transcriptWithTimestamps || text

    console.log('🚀 Calling Groq API for summarization...')
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile', // Fast and powerful model
        messages: [
          {
            role: 'system',
            content: 'You are an expert meeting analyst. Generate detailed, structured summaries in ENGLISH ONLY. Even if the transcript is in another language (Hindi, Romanized Hindi, etc.), translate and summarize it in clear, professional English. Extract specific details, numbers, commitments, and action items. Organize information by topics/categories. When timestamps are available in the transcript, include them at the end of each summary point.'
          },
          {
            role: 'user',
            content: `Analyze this meeting transcript and provide a detailed summary in ENGLISH (translate if needed):

${textToAnalyze}

Generate a comprehensive summary with the following structure:

## Brief Overview
Provide 2-3 sentences summarizing the overall meeting purpose and outcomes.

## Action Items and Commitments
List all specific action items, commitments, decisions, and deliverables mentioned. Include:
- Specific details (numbers, dates, names)
- Who is responsible (if mentioned)
- Deadlines or timeframes
- Context for each item
- Timestamp at the end (if available in transcript)

## Key Topics Discussed
Organize remaining discussion points by logical categories/themes (e.g., "Marketing Strategy", "Revenue Performance", "Team Updates"). For each point:
- Provide specific details, metrics, or numbers mentioned
- Include context and reasoning
- Note any important decisions or conclusions
- Add timestamp at the end (if available)

Format: Write each point as "Description of the point with all specific details [timestamp]"

Example format:
- Company reserves 20 monthly scholarship seats for pay-after-placement full stack program 19:50
- Average lead qualification to conversion time is eight days, with initial interest determined within two days 19:14

Be comprehensive and extract as much specific information as possible from the transcript.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Groq API response received')
    return response.data.choices[0].message.content
  } catch (error) {
    console.error('❌ Groq summarization error:', error.response?.data || error.message)
    return null // Fall back to simple summarization
  }
}

// Meeting scenario analysis
function analyzeMeetingScenario(transcript) {
  const text = transcript.text || ''
  const words = transcript.words || []
  const utterances = transcript.utterances || []

  // Extract meeting insights
  const analysis = {
    totalDuration: transcript.metadata?.duration || 0,
    participantCount: new Set(words.map(w => w.speaker || 0)).size,
    avgConfidence: words.length ? words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length : 0,
    speakerDistribution: {},
    keyTopics: [],
    actionItems: [],
    decisions: [],
    questions: [],
    meetingType: 'general'
  }

  // Analyze speaker distribution
  utterances.forEach(utt => {
    const speaker = `Speaker ${utt.speaker || 'Unknown'}`
    if (!analysis.speakerDistribution[speaker]) {
      analysis.speakerDistribution[speaker] = {
        wordCount: 0,
        duration: 0,
        utteranceCount: 0
      }
    }
    analysis.speakerDistribution[speaker].wordCount += (utt.words?.length || 0)
    analysis.speakerDistribution[speaker].duration += ((utt.end || 0) - (utt.start || 0))
    analysis.speakerDistribution[speaker].utteranceCount += 1
  })

  // Extract key phrases and action items using patterns
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase().trim()

    // Action items
    if (lower.includes('action item') || lower.includes('todo') || lower.includes('need to') ||
        lower.includes('should') || lower.includes('will do') || lower.includes('assign')) {
      analysis.actionItems.push(sentence.trim())
    }

    // Decisions
    if (lower.includes('decided') || lower.includes('agree') || lower.includes('conclusion') ||
        lower.includes('final') || lower.includes('approved')) {
      analysis.decisions.push(sentence.trim())
    }

    // Questions
    if (sentence.includes('?') || lower.includes('question')) {
      analysis.questions.push(sentence.trim())
    }
  })

  // Determine meeting type
  if (text.toLowerCase().includes('standup') || text.toLowerCase().includes('daily')) {
    analysis.meetingType = 'standup'
  } else if (text.toLowerCase().includes('review') || text.toLowerCase().includes('retrospective')) {
    analysis.meetingType = 'review'
  } else if (text.toLowerCase().includes('planning') || text.toLowerCase().includes('sprint')) {
    analysis.meetingType = 'planning'
  } else if (text.toLowerCase().includes('interview')) {
    analysis.meetingType = 'interview'
  }

  return analysis
}

// Generate comprehensive meeting summary
async function generateMeetingSummary(transcript) {
  try {
    const analysis = analyzeMeetingScenario(transcript)
    const text = transcript.text || ''

    if (!text || text.length < 50) {
      return {
        summary: 'Unable to generate summary - transcript too short or empty.',
        analysis,
        keyPoints: [],
        recommendations: []
      }
    }

    // Use Groq AI summarization
    console.log('🤖 Generating Groq AI summary...')
    const aiSummary = await generateAISummary(text, transcript)

    if (aiSummary) {
      console.log('✅ Groq AI summary generated successfully with Llama 3.1')

      // Parse AI response to extract structured data
      const keyPoints = []
      const lines = aiSummary.split('\n').filter(line => line.trim())

      // Extract key points from AI summary
      lines.forEach(line => {
        if (line.match(/^[\d\-\*•]/) || line.includes(':')) {
          keyPoints.push(line.replace(/^[\d\-\*•\.\)]+\s*/, '').trim())
        }
      })

      // Generate recommendations
      const recommendations = []
      if (analysis.participantCount > 5) {
        recommendations.push('Consider smaller group meetings for more focused discussions')
      }
      if (analysis.avgConfidence < 0.7) {
        recommendations.push('Audio quality could be improved for better transcription accuracy')
      }
      if (analysis.actionItems.length === 0) {
        recommendations.push('Consider defining clear action items and owners for next steps')
      }

      return {
        summary: aiSummary,
        analysis,
        keyPoints: keyPoints.slice(0, 10),
        recommendations,
        generatedAt: new Date().toISOString(),
        method: 'groq_ai'
      }
    }

    // Fallback: Simple text-based summary
    console.log('⚠️ Using fallback summarization method')
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const shortSummary = sentences.slice(0, 3).join('. ') + '.'

    const keyPoints = []
    if (analysis.actionItems.length > 0) {
      keyPoints.push(...analysis.actionItems.slice(0, 3))
    }
    if (analysis.decisions.length > 0) {
      keyPoints.push(...analysis.decisions.slice(0, 2))
    }

    const recommendations = []
    if (analysis.participantCount > 5) {
      recommendations.push('Consider smaller group meetings for more focused discussions')
    }
    if (analysis.avgConfidence < 0.7) {
      recommendations.push('Audio quality could be improved for better transcription accuracy')
    }
    if (analysis.actionItems.length === 0) {
      recommendations.push('Consider defining clear action items and owners for next steps')
    }

    return {
      summary: shortSummary,
      analysis,
      keyPoints,
      recommendations,
      generatedAt: new Date().toISOString(),
      method: 'fallback'
    }

  } catch (error) {
    console.error('Error generating meeting summary:', error)
    return {
      summary: 'Error generating summary: ' + error.message,
      analysis: analyzeMeetingScenario(transcript),
      keyPoints: [],
      recommendations: [],
      error: error.message
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transcript } = req.body

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    console.log('🤖 Generating AI summary for meeting...')

    // Handle both old format (object) and new format (string with speakers)
    let transcriptToAnalyze
    if (typeof transcript === 'string') {
      // New format: "Speaker 1: text\n\nSpeaker 2: text"
      transcriptToAnalyze = {
        text: transcript,
        words: [],
        segments: [],
        utterances: []
      }
    } else {
      // Old format: object with text, words, segments
      transcriptToAnalyze = transcript
    }

    const summary = await generateMeetingSummary(transcriptToAnalyze)

    console.log('✅ Meeting summary generated successfully')
    res.status(200).json({
      success: true,
      ...summary
    })

  } catch (error) {
    console.error('Summarization error:', error)
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    })
  }
}

export const config = {
  api: {
    responseLimit: '8mb', // Allow larger responses for summary data
  },
}