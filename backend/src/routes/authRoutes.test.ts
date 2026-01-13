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
}))

import authRoutes from './authRoutes.js'
import { db } from '../services/db.js'
import { comparePassword } from '../utils/password.js'
import { errorHandler } from '../middleware/errorHandler.js'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use(errorHandler)

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
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
          password: 'password123',
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
          password: 'password123',
          username: 'testuser',
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
          password: 'password123',
          username: 'testuser',
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
        emailVerified: false,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
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
          password: 'password123',
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
          password: 'password123',
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

    it('should return 200 with tokens for valid login', async () => {
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
          password: 'password123',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.data.accessToken).toBe('mock-access-token')
      expect(response.body.data.refreshToken).toBe('mock-refresh-token')
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
        .send({ token: 'invalid-token', password: 'newpassword123' })

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
        .send({ token: 'valid-token', password: 'newpassword123' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Password reset successfully')
    })
  })
})
