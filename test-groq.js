// Quick test to verify Groq API is working
const fs = require('fs')
const path = require('path')

// Load .env file manually
const envPath = path.join(__dirname, '.env')
const envFile = fs.readFileSync(envPath, 'utf8')
const envLines = envFile.split('\n')
envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    process.env[key] = value
  }
})

async function testGroqAPI() {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    console.log('❌ GROQ_API_KEY not found in environment')
    process.exit(1)
  }

  console.log('✅ GROQ_API_KEY found:', apiKey.substring(0, 10) + '...')
  console.log('🔍 Testing Groq API connection...')

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      console.log('❌ API request failed:', response.status, response.statusText)
      const text = await response.text()
      console.log('Response:', text)
      process.exit(1)
    }

    const data = await response.json()
    const whisperModels = data.data.filter(m => m.id.includes('whisper'))

    console.log('✅ Groq API connection successful!')
    console.log('📋 Available Whisper models:')
    whisperModels.forEach(model => {
      console.log(`  - ${model.id}`)
    })

    console.log('\n✨ All checks passed! Groq API is ready for transcription.')

  } catch (error) {
    console.log('❌ Error testing Groq API:', error.message)
    process.exit(1)
  }
}

testGroqAPI()
