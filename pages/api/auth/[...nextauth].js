import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import crypto from 'crypto'

// Simple password hashing
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" } // 'signin' or 'signup'
      },
      async authorize(credentials) {
        const { email, password, action } = credentials

        if (!email || !password) {
          throw new Error('Email and password required')
        }

        const usersRef = collection(db, 'users')
        const q = query(usersRef, where('email', '==', email))
        const querySnapshot = await getDocs(q)

        if (action === 'signup') {
          // Sign up new user
          if (!querySnapshot.empty) {
            throw new Error('User already exists')
          }

          const hashedPassword = hashPassword(password)
          const newUser = {
            email,
            password: hashedPassword,
            name: email.split('@')[0],
            createdAt: new Date()
          }

          const docRef = await addDoc(usersRef, newUser)
          return {
            id: docRef.id,
            email: newUser.email,
            name: newUser.name
          }
        } else {
          // Sign in existing user
          if (querySnapshot.empty) {
            throw new Error('No user found with this email')
          }

          const userDoc = querySnapshot.docs[0]
          const userData = userDoc.data()

          const hashedPassword = hashPassword(password)
          if (userData.password !== hashedPassword) {
            throw new Error('Invalid password')
          }

          return {
            id: userDoc.id,
            email: userData.email,
            name: userData.name
          }
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
export { authOptions }