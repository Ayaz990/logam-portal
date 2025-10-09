#!/usr/bin/env node

// Script to automatically update all files for production deployment
// Usage: node scripts/setup-production.js https://your-app.vercel.app

const fs = require('fs')
const path = require('path')

const productionUrl = process.argv[2]

if (!productionUrl) {
  console.log('❌ Please provide your production URL')
  console.log('')
  console.log('Usage:')
  console.log('  node scripts/setup-production.js https://your-app.vercel.app')
  console.log('')
  process.exit(1)
}

// Validate URL
if (!productionUrl.startsWith('https://')) {
  console.log('❌ Production URL must start with https://')
  process.exit(1)
}

console.log('🚀 Setting up production with URL:', productionUrl)
console.log('')

// 1. Update extension config.js
const configPath = path.join(__dirname, '../chrome-extension/config.js')
let configContent = fs.readFileSync(configPath, 'utf8')

configContent = `// Centralized API configuration
// Change this URL when deploying to production
const API_URL = '${productionUrl}' // Production URL

function getApiUrl() {
  return API_URL
}
`

fs.writeFileSync(configPath, configContent)
console.log('✅ Updated chrome-extension/config.js')

// 2. Update .env.production
const envProdPath = path.join(__dirname, '../.env.production')
let envProdContent = fs.readFileSync(envProdPath, 'utf8')

envProdContent = envProdContent
  .replace(/NEXTAUTH_URL=.*/g, `NEXTAUTH_URL=${productionUrl}`)
  .replace(/GOOGLE_REDIRECT_URI=.*/g, `GOOGLE_REDIRECT_URI=${productionUrl}/api/auth/callback/google`)

fs.writeFileSync(envProdPath, envProdContent)
console.log('✅ Updated .env.production')

// 3. Update upload.js CORS
const uploadPath = path.join(__dirname, '../pages/api/upload.js')
let uploadContent = fs.readFileSync(uploadPath, 'utf8')

const corsCode = `  // Handle CORS
  const allowedOrigins = [
    'https://meet.google.com',
    'http://localhost:3001',
    '${productionUrl}'
  ]
  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')`

uploadContent = uploadContent.replace(
  /  \/\/ Handle CORS[\s\S]*?res\.setHeader\('Access-Control-Allow-Credentials', 'true'\)/,
  corsCode
)

fs.writeFileSync(uploadPath, uploadContent)
console.log('✅ Updated pages/api/upload.js CORS settings')

console.log('')
console.log('🎉 Production setup complete!')
console.log('')
console.log('📋 Next steps:')
console.log('')
console.log('1. Set environment variables on Vercel Dashboard:')
console.log('   - Copy all variables from .env.production')
console.log('   - Go to Vercel → Settings → Environment Variables')
console.log('   - Paste each variable')
console.log('')
console.log('2. Update Google OAuth redirect URI:')
console.log('   - Go to Google Cloud Console')
console.log('   - Add authorized redirect URI:', productionUrl + '/api/auth/callback/google')
console.log('')
console.log('3. Deploy to Vercel:')
console.log('   - Push to GitHub (auto-deploys)')
console.log('   - Or run: vercel --prod')
console.log('')
console.log('4. Package extension:')
console.log('   - cd chrome-extension')
console.log('   - zip -r ../logam-meet-extension.zip . -x "*.git*"')
console.log('')
console.log('5. Test everything:')
console.log('   - Visit', productionUrl)
console.log('   - Sign up and create admin user')
console.log('   - Install extension and test recording')
console.log('')
