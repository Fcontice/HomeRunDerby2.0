// Quick test to verify email verification database update works
import dotenv from 'dotenv'
dotenv.config()

import { db } from './src/services/db.js'

async function testEmailVerification() {
  try {
    console.log('🔍 Testing email verification update...\n')

    // Find user by email
    const email = 'conti.frank11@gmail.com' // Replace with your email
    const user = await db.user.findUnique({ email })

    if (!user) {
      console.log('❌ User not found')
      return
    }

    console.log('📋 Current user state:')
    console.log(`  - Email: ${user.email}`)
    console.log(`  - Username: ${user.username}`)
    console.log(`  - Email Verified: ${user.emailVerified}`)
    console.log(`  - Auth Provider: ${user.authProvider}`)
    console.log(`  - Verification Token: ${user.verificationToken ? 'Set' : 'Not set'}`)
    console.log()

    if (!user.emailVerified) {
      console.log('⚠️  Email is NOT verified. Updating now...')

      const updated = await db.user.update(
        { id: user.id },
        {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        }
      )

      console.log('✅ Update successful!')
      console.log(`  - Email Verified: ${updated.emailVerified}`)
    } else {
      console.log('✅ Email is already verified!')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testEmailVerification()
