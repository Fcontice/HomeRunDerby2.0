import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// Mock the db service
vi.mock('../services/db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock supabase admin to prevent real connections
vi.mock('../config/supabase.js', () => ({
  default: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          is: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        match: vi.fn(() => ({
          is: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
}))

// Mock email service
vi.mock('../services/emailService.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

// Mock password utils
vi.mock('../utils/password.js', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  comparePassword: vi.fn().mockResolvedValue(true),
}))

// Mock JWT utils
vi.mock('../utils/jwt.js', () => ({
  generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  generateRandomToken: vi.fn().mockReturnValue('mock-random-token'),
  createTokenExpiry: vi.fn().mockReturnValue(new Date(Date.now() + 86400000).toISOString()),
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-123', email: 'test@example.com', role: 'user' }),
}))

// Mock CSRF middleware
vi.mock('../middleware/csrf.js', () => ({
  generateCSRFToken: vi.fn().mockReturnValue('mock-csrf-token'),
  csrfProtection: vi.fn((_req, _res, next) => next()),
  csrfTokenEndpoint: vi.fn((_req, res) => res.json({ success: true, data: { csrfToken: 'mock-csrf-token' } })),
}))

import cookieParser from 'cookie-parser'
import authRoutes from './authRoutes.js'
import { db } from '../services/db.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js'
import { generateAccessToken, generateRefreshToken, generateRandomToken, createTokenExpiry } from '../utils/jwt.js'
import { generateCSRFToken } from '../middleware/csrf.js'
import { errorHandler } from '../middleware/errorHandler.js'

// Create test app
const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use(errorHandler)

describe('Auth Routes', () => {
  beforeEach(() => {
    // resetAllMocks clears BOTH call history AND mock implementations
    // clearAllMocks only clears call history, leaving mock return values intact
    vi.resetAllMocks()

    // Restore default mock implementations after reset
    vi.mocked(hashPassword).mockResolvedValue('hashed-password')
    vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)
    vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)
    vi.mocked(generateAccessToken).mockReturnValue('mock-access-token')
    vi.mocked(generateRefreshToken).mockReturnValue('mock-refresh-token')
    vi.mocked(generateRandomToken).mockReturnValue('mock-random-token')
    vi.mocked(createTokenExpiry).mockReturnValue(new Date(Date.now() + 86400000).toISOString())
    vi.mocked(generateCSRFToken).mockReturnValue('mock-csrf-token')
  })

  describe('POST /api/auth/register', () => {
    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
          username: 'testuser',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          username: 'testuser',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should return 400 for missing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should return 409 if email already exists', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValueOnce({
        id: 'existing-user',
        email: 'test@example.com',
      } as any)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
          phoneNumber: '555-123-4567',
        })

      expect(response.status).toBe(409)
      expect(response.body.error.message).toContain('Email already registered')
    })

    it('should return 409 if username already exists', async () => {
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-user', username: 'testuser' } as any) // username check

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
          phoneNumber: '555-123-4567',
        })

      expect(response.status).toBe(409)
      expect(response.body.error.message).toContain('Username already taken')
    })

    it('should create user successfully with valid data', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)
      vi.mocked(db.user.create).mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com',
        username: 'testuser',
        phoneNumber: '555-123-4567',
        emailVerified: false,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          username: 'testuser',
          phoneNumber: '555-123-4567',
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.message).toContain('Registration successful')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})

      expect(response.status).toBe(400)
    })

    it('should return 401 for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })

      expect(response.status).toBe(401)
      expect(response.body.error.message).toContain('Invalid email or password')
    })

    it('should return 401 for unverified email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: false,
        passwordHash: 'hashed',
        deletedAt: null,
      } as any)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })

      expect(response.status).toBe(401)
      expect(response.body.error.message).toContain('verify your email')
    })

    it('should return 401 for wrong password', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        passwordHash: 'hashed',
        deletedAt: null,
      } as any)
      vi.mocked(comparePassword).mockResolvedValue(false)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })

      expect(response.status).toBe(401)
    })

    it('should return 200 with cookies and CSRF token for valid login', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        emailVerified: true,
        passwordHash: 'hashed',
        role: 'user',
        authProvider: 'email',
        avatarUrl: null,
        deletedAt: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(comparePassword).mockResolvedValue(true)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      // Tokens are now in httpOnly cookies, CSRF token in response
      expect(response.body.data.csrfToken).toBe('mock-csrf-token')
      // Check that cookies are set
      const cookies = response.headers['set-cookie'] as unknown as string[]
      expect(cookies).toBeDefined()
      expect(cookies.some((c: string) => c.includes('access_token'))).toBe(true)
      expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(true)
      expect(cookies.some((c: string) => c.includes('XSRF-TOKEN'))).toBe(true)
    })
  })

  describe('POST /api/auth/verify-email', () => {
    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid token', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('Invalid or expired')
    })

    it('should verify email successfully', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'valid-token' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Email verified successfully')
    })
  })

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid' })

      expect(response.status).toBe(400)
    })

    it('should return 200 even for non-existent email (security)', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should send reset email for existing user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        authProvider: 'email',
        deletedAt: null,
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    it('should return 400 for missing token or password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({})

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid token', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', password: 'newPassword123' })

      expect(response.status).toBe(400)
      expect(response.body.error.message).toContain('Invalid or expired')
    })

    it('should reset password successfully', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue({
        id: 'user-123',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid-token', password: 'newPassword123' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Password reset successfully')
    })
  })
})
