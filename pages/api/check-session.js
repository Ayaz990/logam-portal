// Custom session check endpoint with CORS support for Chrome extension
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'

export default async function handler(req, res) {
  // Handle CORS for Chrome extension
  const allowedOrigins = [
    'https://meet.google.com',
    'http://localhost:3001',
    'https://logam-portal.vercel.app'
  ]

  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (session) {
      return res.status(200).json({
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role
        }
      })
    } else {
      return res.status(200).json({ user: null })
    }
  } catch (error) {
    console.error('Session check error:', error)
    return res.status(500).json({ error: 'Failed to check session' })
  }
}
