import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Short-lived access token for security (15 minutes)
const ACCESS_TOKEN_EXPIRES_IN = '15m'

// Long-lived refresh token stored in httpOnly cookie (7 days)
const REFRESH_TOKEN_EXPIRES_IN = '7d'

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

/**
 * Generate access token (15 minute expiry for cookie-based auth)
 * Short expiry limits damage if token is somehow compromised
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  })
}

/**
 * Generate refresh token (7 day expiry)
 * Stored in httpOnly cookie, used to get new access tokens
 */
export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  })
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Generate random token for email verification and password reset
 */
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Create token expiry date (returns ISO 8601 string for database compatibility)
 */
export function createTokenExpiry(hours: number = 24): string {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + hours)
  return expiry.toISOString()
}
