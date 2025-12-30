/**
 * Environment Variable Loader
 * This MUST be imported first in server.ts before any other local modules
 */

import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate critical environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing critical Supabase environment variables!')
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('Check your .env file in the backend directory')
  process.exit(1)
}

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.error('❌ Missing critical Stripe environment variables!')
  console.error('Required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET')
  console.error('Check your .env file in the backend directory')
  process.exit(1)
}

console.log('✅ Environment variables loaded')

// Export typed environment variables
export const env = {
  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  // Stripe (validated above, safe to assert non-null)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,

  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Other environment variables
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@localhost',
}
