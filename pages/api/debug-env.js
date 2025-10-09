// Diagnostic endpoint to check environment configuration
// Access at: /api/debug-env

export default async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      NEXTAUTH_SECRET: {
        exists: !!process.env.NEXTAUTH_SECRET,
        value: process.env.NEXTAUTH_SECRET ? `${process.env.NEXTAUTH_SECRET.substring(0, 10)}...` : null
      },
      GROQ_API_KEY: {
        exists: !!process.env.GROQ_API_KEY,
        value: process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : null
      },
      USE_GROQ: {
        exists: !!process.env.USE_GROQ,
        value: process.env.USE_GROQ
      },
      AUTO_TRANSCRIPT: {
        exists: !!process.env.AUTO_TRANSCRIPT,
        value: process.env.AUTO_TRANSCRIPT
      },
      VERCEL_URL: {
        exists: !!process.env.VERCEL_URL,
        value: process.env.VERCEL_URL
      },
      NEXTAUTH_URL: {
        exists: !!process.env.NEXTAUTH_URL,
        value: process.env.NEXTAUTH_URL
      }
    },
    baseUrl: process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3001'
  }

  // Check if all critical env vars are present
  const allPresent =
    checks.checks.NEXTAUTH_SECRET.exists &&
    checks.checks.GROQ_API_KEY.exists &&
    checks.checks.USE_GROQ.exists &&
    checks.checks.AUTO_TRANSCRIPT.exists

  return res.status(200).json({
    status: allPresent ? 'OK' : 'MISSING_ENV_VARS',
    message: allPresent
      ? 'All environment variables are configured correctly'
      : 'Some environment variables are missing - check the details below',
    ...checks
  })
}
