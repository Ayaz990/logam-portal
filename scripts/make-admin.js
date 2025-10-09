// Script to make a user an admin
// Usage: node scripts/make-admin.js user@example.com

const admin = require('firebase-admin')
const serviceAccount = require('../serviceAccountKey.json')

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function makeAdmin(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`)

    const usersRef = db.collection('users')
    const snapshot = await usersRef.where('email', '==', email).get()

    if (snapshot.empty) {
      console.log('❌ User not found with email:', email)
      console.log('💡 Make sure the user has signed up first')
      process.exit(1)
    }

    const userDoc = snapshot.docs[0]

    await userDoc.ref.update({
      role: 'admin'
    })

    console.log('✅ User is now an admin!')
    console.log('📧 Email:', email)
    console.log('🆔 User ID:', userDoc.id)
    console.log('')
    console.log('🔄 User needs to sign out and sign back in to see admin access')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.log('Usage: node scripts/make-admin.js user@example.com')
  process.exit(1)
}

makeAdmin(email)
