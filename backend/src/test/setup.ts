import { vi, beforeAll, afterAll, afterEach } from 'vitest'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.RESEND_API_KEY = 're_test_mock'
process.env.FRONTEND_URL = 'http://localhost:5173'

// Global test hooks
beforeAll(() => {
  console.log('Starting test suite...')
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  console.log('Test suite complete.')
})
