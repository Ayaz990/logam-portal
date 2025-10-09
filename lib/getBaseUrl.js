/**
 * Get the base URL for internal API calls
 * Works in both development and production (Vercel)
 */
export function getBaseUrl() {
  // In production (Vercel), use the deployment URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // In development, use NEXTAUTH_URL if available
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  // Fallback to localhost
  return 'http://localhost:3001'
}
