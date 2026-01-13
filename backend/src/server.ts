// MUST load environment variables FIRST before any other imports
import './env.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import passport from './config/passport.js'
import authRoutes from './routes/authRoutes.js'
import playerRoutes from './routes/playerRoutes.js'
import teamRoutes from './routes/teamRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import leaderboardRoutes from './routes/leaderboardRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import seasonRoutes from './routes/seasonRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import rateLimit from 'express-rate-limit'

const app = express()
const PORT = process.env.PORT || 5000

// ==================== SECURITY MIDDLEWARE ====================

// Helmet for security headers
app.use(helmet())

// CORS configuration
const allowedOrigins: string[] = []

// Always allow the configured frontend URL
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

// Development: allow localhost
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173')
  allowedOrigins.push('http://localhost:3000')
}

// Production: add additional domains if needed
if (process.env.NODE_ENV === 'production') {
  // Add custom domain if different from FRONTEND_URL
  if (process.env.CUSTOM_DOMAIN) {
    allowedOrigins.push(process.env.CUSTOM_DOMAIN)
  }
}

// Fallback if no origins configured
if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173')
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
})

app.use('/api/', limiter)

// ==================== GENERAL MIDDLEWARE ====================

// Webhook endpoint needs raw body for signature verification
// Must be registered BEFORE express.json()
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Initialize Passport
app.use(passport.initialize())

// ==================== HEALTH CHECK ====================

// Health check routes (includes Python environment check)
app.use('/health', healthRoutes)

// ==================== API ROUTES ====================

// Welcome endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Home Run Derby 2.0 API',
    version: '1.0.0',
  })
})

// Authentication routes
app.use('/api/auth', authRoutes)

// Player routes
app.use('/api/players', playerRoutes)

// Team routes
app.use('/api/teams', teamRoutes)

// Payment routes
app.use('/api/payments', paymentRoutes)

// Leaderboard routes
app.use('/api/leaderboards', leaderboardRoutes)

// Admin routes
app.use('/api/admin', adminRoutes)

// Season routes (public /api/season/* and admin routes reuse same router)
// Public: GET /api/season/current
// Admin: GET/POST/PATCH /api/admin/seasons/*
app.use('/api/season', seasonRoutes)
app.use('/api/admin/seasons', seasonRoutes)

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 Allowed Origins: ${allowedOrigins.join(', ')}`)
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✓ Set' : '⚠ Not set (using default)'}`)
  console.log(
    `📧 Resend API: ${process.env.RESEND_API_KEY ? '✓ Configured' : '⚠ Not configured'}`
  )
  console.log(
    `🔑 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '⚠ Not configured'}`
  )
  console.log(
    `💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? '✓ Configured' : '⚠ Not configured'}`
  )
})

export default app
