import { whisper } from 'whisper-node'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const audioFile = files.audio?.[0]

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    console.log('🧪 Testing Whisper with file:', {
      originalName: audioFile.originalFilename,
      size: audioFile.size,
      type: audioFile.mimetype,
      path: audioFile.filepath
    })

    // Test with most basic options
    const testOptions = {
      modelName: 'tiny.en'
    }

    console.log('🔄 Testing Whisper with minimal options...')

    try {
      const result = await whisper(audioFile.filepath, testOptions)

      console.log('✅ Whisper test result:', {
        type: typeof result,
        isArray: Array.isArray(result),
        isNull: result === null,
        isUndefined: result === undefined,
        keys: result ? Object.keys(result) : [],
        result: result
      })

      return res.status(200).json({
        success: true,
        debug: {
          file: {
            name: audioFile.originalFilename,
            size: audioFile.size,
            type: audioFile.mimetype
          },
          whisper: {
            model: testOptions.modelName,
            resultType: typeof result,
            hasResult: !!result,
            resultKeys: result ? Object.keys(result) : [],
            resultSample: result
          }
        },
        result: result
      })

    } catch (whisperError) {
      console.error('❌ Whisper error:', whisperError)

      return res.status(500).json({
        success: false,
        error: 'Whisper failed',
        details: whisperError.message,
        debug: {
          file: {
            name: audioFile.originalFilename,
            size: audioFile.size,
            type: audioFile.mimetype
          },
          error: {
            message: whisperError.message,
            stack: whisperError.stack
          }
        }
      })
    }

  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    })
  }
}