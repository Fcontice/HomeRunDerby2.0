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
import leaderboardRoutes from './routes/leaderboardRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import seasonRoutes from './routes/seasonRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import { initializeScheduledJobs, stopScheduledJobs } from './services/scheduledJobs.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { csrfProtection, csrfTokenEndpoint } from './middleware/csrf.js'
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

// Production: add production domains
if (process.env.NODE_ENV === 'production') {
  // Always allow the production domain
  allowedOrigins.push('https://www.hrderbyus.com')
  allowedOrigins.push('https://hrderbyus.com')
  // Add custom domain if configured
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
    credentials: true, // Required for httpOnly cookies
    exposedHeaders: ['X-Total-Count'], // Allow frontend to read pagination headers
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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Initialize Passport
app.use(passport.initialize())

// ==================== HEALTH CHECK ====================

// Health check routes (includes Python environment check)
app.use('/health', healthRoutes)

// ==================== CSRF PROTECTION ====================

// CSRF token endpoint - frontend calls this to get initial CSRF token
app.get('/api/csrf-token', csrfTokenEndpoint)

// Apply CSRF protection to all API routes (after getting token endpoint)
app.use('/api/', csrfProtection)

// ==================== API ROUTES ====================

// Welcome endpoint
app.get('/api', (_req, res) => {
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

// Leaderboard routes
app.use('/api/leaderboards', leaderboardRoutes)

// Admin routes
app.use('/api/admin', adminRoutes)

// Season routes (public /api/season/* and admin routes reuse same router)
// Public: GET /api/season/current
// Admin: GET/POST/PATCH /api/admin/seasons/*
app.use('/api/season', seasonRoutes)
app.use('/api/admin/seasons', seasonRoutes)

// Job management routes (admin only)
app.use('/api/admin/jobs', jobRoutes)

// ==================== ERROR HANDLING ====================

// 404 handler (must be after all routes)
app.use(notFoundHandler)

// Global error handler (must be last)
app.use(errorHandler)

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
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

  // Initialize scheduled jobs after server starts
  initializeScheduledJobs()
})

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`)

  // Stop scheduled jobs first
  stopScheduledJobs()

  // Close the HTTP server
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export default app
