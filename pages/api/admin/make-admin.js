import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

/**
 * Utility API to make a user an admin
 *
 * SECURITY: This endpoint should be protected or removed in production!
 * For development: Use this to create your first admin user
 *
 * Usage: POST /api/admin/make-admin
 * Body: { email: "user@example.com", adminSecret: "your-secret-key" }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, adminSecret } = req.body

    // Security check: Only allow if correct secret is provided
    // Set this in your environment variables
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-this-secret-key'

    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' })
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
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

    // Update user role to admin
    await updateDoc(userRef, {
      role: 'admin',
      updatedAt: new Date()
    })

    return res.status(200).json({
      success: true,
      message: `User ${email} is now an admin`,
      userId: userDoc.id
    })
  } catch (error) {
    console.error('Make admin error:', error)
    return res.status(500).json({
      error: 'Failed to make user admin',
      message: error.message
    })
  }
}
