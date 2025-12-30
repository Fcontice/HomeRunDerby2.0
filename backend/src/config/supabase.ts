import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Set default timezone to UTC via environment variable
// This fixes PostgreSQL "time zone not recognized" errors
process.env.TZ = 'UTC'

// Admin client with service role key (bypasses RLS)
// Use this for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// Regular client with anon key (respects RLS)
// Use this for user-facing operations if needed
export const supabase = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
  db: {
    schema: 'public'
  }
})

// Initialize database timezone on first connection
async function initializeTimezone() {
  try {
    // Set the session timezone to UTC
    await supabaseAdmin.rpc('set_config', {
      setting_name: 'timezone',
      new_value: 'UTC',
      is_local: false
    })
  } catch (error) {
    // Silently fail if RPC doesn't exist - timezone may be set at database level
    console.warn('Could not set timezone via RPC, using database default')
  }
}

// Call initialization (non-blocking)
initializeTimezone().catch(() => {})

export default supabaseAdmin
