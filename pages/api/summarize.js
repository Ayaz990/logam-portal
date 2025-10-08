import axios from 'axios'

// Groq API for AI summarization
async function generateAISummary(text) {
  try {
    const useGroq = process.env.USE_GROQ === 'true'
    const groqApiKey = process.env.GROQ_API_KEY

    console.log('🔍 Groq config check:', { useGroq, hasApiKey: !!groqApiKey })

    if (!useGroq || !groqApiKey) {
      console.warn('⚠️ Groq not configured, falling back to simple summarization')
      return null // Fall back to simple summarization
    }

    console.log('🚀 Calling Groq API for summarization...')
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-70b-versatile', // Fast and powerful model
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting assistant. Generate concise, actionable summaries of meeting transcripts. Focus on key points, decisions, action items, and next steps.'
          },
          {
            role: 'user',
            content: `Please summarize this meeting transcript:\n\n${text}\n\nProvide:\n1. A brief summary (2-3 sentences)\n2. Key points discussed\n3. Decisions made\n4. Action items identified\n5. Questions raised`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
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
    const aiSummary = await generateAISummary(text)

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
    const summary = await generateMeetingSummary(transcript)

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