import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import crypto from 'crypto'

/**
 * Utility API to reset user password manually
 *
 * SECURITY: This endpoint should be protected or removed in production!
 * For development: Use this to reset forgotten passwords
 *
 * Usage: POST /api/admin/reset-password
 * Body: { email: "user@example.com", newPassword: "newpassword", adminSecret: "your-secret-key" }
 */

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, newPassword, adminSecret } = req.body

    // Security check: Only allow if correct secret is provided
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret-key'

    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' })
    }

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Find user by email
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('email', '==', email))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userDoc = querySnapshot.docs[0]
    const userRef = doc(db, 'users', userDoc.id)

    // Update password
    const hashedPassword = hashPassword(newPassword)
    await updateDoc(userRef, {
      password: hashedPassword,
      passwordResetAt: new Date()
    })

    return res.status(200).json({
      success: true,
      message: `Password reset for ${email}`,
      userId: userDoc.id
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({
      error: 'Failed to reset password',
      message: error.message
    })
  }
}
