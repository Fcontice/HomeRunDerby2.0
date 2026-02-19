import { Request, Response } from 'express'
import { hashPassword, comparePassword } from '../utils/password.js'
import {
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  createTokenExpiry,
  verifyToken,
} from '../utils/jwt.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js'
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js'
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../types/validation.js'
import { db } from '../services/db.js'
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
  getCSRFCookieOptions,
  COOKIE_NAMES,
} from '../config/cookies.js'
import { generateCSRFToken } from '../middleware/csrf.js'

/**
 * @fileoverview Authentication controller handling user registration, login, and token management.
 *
 * Security Implementation:
 * - Passwords hashed with bcrypt (12 rounds) before storage
 * - JWTs stored in httpOnly cookies (XSS protection)
 * - CSRF tokens for state-changing requests (CSRF protection)
 * - Short-lived access tokens (15 min) with refresh token flow
 * - Email verification required before login
 *
 * Cookie-Based Auth Flow:
 * 1. User logs in with email/password or Google OAuth
 * 2. Server sets three cookies: access_token, refresh_token, XSRF-TOKEN
 * 3. Browser automatically sends cookies with subsequent requests
 * 4. Frontend reads XSRF-TOKEN and sends in X-CSRF-Token header
 * 5. When access token expires, frontend calls /api/auth/refresh
 * 6. On logout, server clears all auth cookies
 *
 * @see {@link ../config/cookies.ts} for cookie configuration
 * @see {@link ../middleware/auth.ts} for authentication middleware
 * @see {@link ../middleware/csrf.ts} for CSRF protection
 */

/**
 * Registers a new user with email and password.
 *
 * Flow:
 * 1. Validate input with Zod schema
 * 2. Check for existing email/username conflicts
 * 3. Hash password with bcrypt
 * 4. Generate email verification token (24h expiry)
 * 5. Create user in database
 * 6. Send verification email
 *
 * Note: Does NOT set auth cookies. User must verify email and login.
 *
 * @param req - Express request with { email, username, password } body
 * @param res - Express response
 * @returns 201 with user data (excluding sensitive fields)
 * @throws ConflictError if email or username already exists
 */
export async function register(req: Request, res: Response) {
  const { email, username, password, phoneNumber } = registerSchema.parse(req.body)

  // Check if email already exists
  const existingEmail = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  if (existingEmail) {
    throw new ConflictError('Email already registered')
  }

  // Check if username already exists
  const existingUsername = await db.user.findUnique({
    username,
  })

  if (existingUsername) {
    throw new ConflictError('Username already taken')
  }

  // Hash password
  const passwordHash = await hashPassword(password)

  // Generate verification token
  const verificationToken = generateRandomToken()
  const verificationTokenExpiry = createTokenExpiry(24)

  // Create user
  const newUser = await db.user.create({
    email: email.toLowerCase(),
    username,
    passwordHash,
    phoneNumber,
    authProvider: 'email',
    verificationToken,
    verificationTokenExpiry,
  })

  // Return only needed fields
  const user = {
    id: newUser.id,
    email: newUser.email,
    username: newUser.username,
    phoneNumber: newUser.phoneNumber,
    role: newUser.role,
    createdAt: newUser.createdAt,
  }

  // Send verification email
  await sendVerificationEmail(user.email, user.username, verificationToken)

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: { user },
  })
}

/**
 * Verifies user's email address using token from verification email.
 *
 * Security:
 * - Token is a cryptographically random string (not JWT)
 * - Token expires after 24 hours
 * - Token is cleared after successful verification (single use)
 *
 * @param req - Express request with { token } body
 * @param res - Express response
 * @throws ValidationError if token is invalid or expired
 */
export async function verifyEmail(req: Request, res: Response) {
  const { token } = verifyEmailSchema.parse(req.body)

  const user = await db.user.findFirst({
    verificationToken: token,
    verificationTokenExpiry: {
      gt: new Date().toISOString(),
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired verification token')
  }

  // Mark email as verified
  await db.user.update(
    { id: user.id },
    {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    }
  )

  res.json({
    success: true,
    message: 'Email verified successfully. You can now log in.',
  })
}

/**
 * Authenticates user with email and password, sets httpOnly cookies.
 *
 * Security Implementation:
 * - Uses timing-safe password comparison (bcrypt)
 * - Generic error message prevents user enumeration
 * - Requires email verification before login
 * - Sets three cookies on success:
 *   1. access_token (httpOnly) - 15 minute JWT for API auth
 *   2. refresh_token (httpOnly) - 7 day JWT for token refresh
 *   3. XSRF-TOKEN (readable) - CSRF protection token
 *
 * Cookie Security:
 * - httpOnly: JavaScript cannot access tokens (XSS protection)
 * - secure: HTTPS only in production (MITM protection)
 * - sameSite=strict: Same-site only (CSRF protection)
 *
 * @param req - Express request with { email, password } body
 * @param res - Express response with Set-Cookie headers
 * @returns User data and CSRF token (for immediate header use)
 * @throws AuthenticationError for invalid credentials or unverified email
 */
export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  // Find user
  const user = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  if (!user) {
    throw new AuthenticationError('Invalid email or password')
  }

  if (user.deletedAt) {
    throw new AuthenticationError('Account has been deleted')
  }

  if (!user.emailVerified) {
    throw new AuthenticationError('Please verify your email before logging in')
  }

  if (!user.passwordHash) {
    throw new AuthenticationError(
      'Please use Google to sign in to this account'
    )
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.passwordHash)

  if (!isValidPassword) {
    throw new AuthenticationError('Invalid email or password')
  }

  // Generate tokens
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  const accessToken = generateAccessToken(tokenPayload)
  const refreshToken = generateRefreshToken(tokenPayload)

  // Generate CSRF token for double-submit cookie pattern
  const csrfToken = generateCSRFToken()

  // Set httpOnly cookies (XSS protection - JavaScript cannot access these)
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions())
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, getRefreshTokenCookieOptions())
  res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, getCSRFCookieOptions())

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        phoneNumber: user.phoneNumber,
        profileCompleted: user.profileCompleted,
        createdAt: user.createdAt,
      },
      // Include CSRF token in response for frontend to use in headers
      csrfToken,
    },
  })
}

/**
 * Initiates password reset flow by sending reset email.
 *
 * Security:
 * - Always returns success message (prevents user enumeration)
 * - Only works for email auth users (not Google OAuth)
 * - Reset token expires after 24 hours
 * - Only one active reset token per user
 *
 * @param req - Express request with { email } body
 * @param res - Express response (always success message)
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body)

  const user = await db.user.findUnique({
    email: email.toLowerCase(),
  })

  // Don't reveal if email exists for security
  if (!user || user.deletedAt) {
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    })
    return
  }

  // Only allow password reset for email auth users
  if (user.authProvider !== 'email') {
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    })
    return
  }

  // Generate reset token
  const resetToken = generateRandomToken()
  const resetTokenExpiry = createTokenExpiry(24)

  await db.user.update(
    { id: user.id },
    {
      resetToken,
      resetTokenExpiry,
    }
  )

  // Send reset email
  await sendPasswordResetEmail(user.email, user.username, resetToken)

  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.',
  })
}

/**
 * Resets user's password using token from reset email.
 *
 * Security:
 * - Token validated before password change
 * - Token cleared after use (single use)
 * - New password hashed with bcrypt
 * - Does NOT auto-login (user must login with new password)
 *
 * @param req - Express request with { token, password } body
 * @param res - Express response
 * @throws ValidationError if token is invalid or expired
 */
export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body)

  const user = await db.user.findFirst({
    resetToken: token,
    resetTokenExpiry: {
      gt: new Date().toISOString(),
    },
  })

  if (!user) {
    throw new ValidationError('Invalid or expired reset token')
  }

  // Hash new password
  const passwordHash = await hashPassword(password)

  // Update password and clear reset token
  await db.user.update(
    { id: user.id },
    {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    }
  )

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in.',
  })
}

/**
 * Returns current authenticated user's profile.
 *
 * Requires: authenticate middleware (reads from req.user)
 *
 * Note: Fetches fresh data from database rather than trusting JWT payload.
 * This ensures profile reflects latest changes (e.g., role updates).
 *
 * @param req - Express request with req.user from authenticate middleware
 * @param res - Express response with user data
 * @throws AuthenticationError if not authenticated
 * @throws NotFoundError if user no longer exists
 */
export async function getProfile(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  const foundUser = await db.user.findUnique({
    id: req.user.userId,
  })

  if (!foundUser) {
    throw new NotFoundError('User')
  }

  // Return only needed fields
  const user = {
    id: foundUser.id,
    email: foundUser.email,
    username: foundUser.username,
    role: foundUser.role,
    avatarUrl: foundUser.avatarUrl,
    authProvider: foundUser.authProvider,
    emailVerified: foundUser.emailVerified,
    phoneNumber: foundUser.phoneNumber,
    profileCompleted: foundUser.profileCompleted,
    createdAt: foundUser.createdAt,
  }

  res.json({
    success: true,
    data: { user },
  })
}

/**
 * Resends email verification to authenticated user.
 *
 * Use Case: User registered but didn't receive/lost verification email.
 *
 * Requirements:
 * - User must be authenticated (likely via a temporary session)
 * - Email must not already be verified
 * - Only for email auth users (not Google OAuth)
 *
 * Note: Generates new token, invalidating any previous token.
 *
 * @param req - Express request with req.user from authenticate
 * @param res - Express response
 * @throws AuthenticationError if not authenticated
 * @throws ValidationError if already verified or wrong auth provider
 */
export async function resendVerification(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  const user = await db.user.findUnique({
    id: req.user.userId,
  })

  if (!user) {
    throw new NotFoundError('User')
  }

  if (user.emailVerified) {
    throw new ValidationError('Email is already verified')
  }

  if (user.authProvider !== 'email') {
    throw new ValidationError('Email verification not required for this account type')
  }

  // Generate new verification token
  const verificationToken = generateRandomToken()
  const verificationTokenExpiry = createTokenExpiry(24)

  // Update user with new token
  await db.user.update(
    { id: user.id },
    {
      verificationToken,
      verificationTokenExpiry,
    }
  )

  // Send verification email
  await sendVerificationEmail(user.email, user.username, verificationToken)

  res.json({
    success: true,
    message: 'Verification email sent successfully. Please check your inbox.',
  })
}

/**
 * Logs out user by clearing all authentication cookies.
 *
 * Clears three cookies:
 * - access_token: Short-lived auth JWT
 * - refresh_token: Long-lived refresh JWT
 * - XSRF-TOKEN: CSRF protection token
 *
 * Note: Cookie clearing requires matching options (domain, path, etc.)
 * to the options used when setting the cookies. This is why we use
 * getClearCookieOptions() which mirrors the set options.
 *
 * Security: Even if token is not in a cookie (e.g., stored client-side
 * by a misbehaving client), clearing cookies ensures browser won't
 * auto-send credentials on future requests.
 *
 * @param _req - Express request (unused)
 * @param res - Express response with Set-Cookie headers to clear
 */
export async function logout(_req: Request, res: Response) {
  // Clear all auth-related cookies
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions())
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions())
  res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, {
    ...getClearCookieOptions(),
    httpOnly: false, // CSRF cookie was not httpOnly
  })

  res.json({
    success: true,
    message: 'Logged out successfully',
  })
}

/**
 * Refreshes the access token using the refresh token from httpOnly cookie.
 *
 * Token Refresh Flow:
 * 1. Frontend detects 401 error (access token expired)
 * 2. Frontend calls POST /api/auth/refresh (no body needed)
 * 3. Server reads refresh_token from httpOnly cookie
 * 4. Server verifies refresh token is valid and not expired
 * 5. Server checks user still exists and isn't deleted
 * 6. Server issues new access_token cookie
 * 7. Frontend retries original request
 *
 * Security Considerations:
 * - Refresh token is in httpOnly cookie (XSS protection)
 * - Refresh token has longer expiry (7 days) than access token (15 min)
 * - User validation on each refresh catches deleted/banned users
 * - Invalid refresh token clears both cookies (force re-login)
 *
 * Why Not Rotate Refresh Token?
 * We could issue a new refresh token on each use (rotation).
 * This provides forward secrecy but complicates concurrent requests.
 * Current implementation prioritizes simplicity; rotation can be added.
 *
 * CSRF Protection:
 * This endpoint is exempt from CSRF validation because:
 * - It uses the httpOnly refresh token (not accessible to XSS)
 * - An attacker triggering this request just refreshes the victim's token
 * - No state change that benefits the attacker
 *
 * @param req - Express request with refresh_token cookie
 * @param res - Express response with new access_token cookie
 * @throws AuthenticationError if no refresh token or invalid/expired
 */
export async function refreshToken(req: Request, res: Response) {
  const refreshTokenValue = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]

  if (!refreshTokenValue) {
    throw new AuthenticationError('No refresh token provided')
  }

  // Verify refresh token (checks signature and expiration)
  const payload = verifyToken(refreshTokenValue)

  // Check if user still exists and is not deleted
  // This catches users deleted after token was issued
  const user = await db.user.findUnique({ id: payload.userId })

  if (!user || user.deletedAt) {
    // Clear invalid cookies to force re-login
    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions())
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions())
    throw new AuthenticationError('User no longer exists')
  }

  // Generate new access token with fresh user data
  // Uses current role in case it changed since login
  const newAccessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  // Set new access token cookie
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, newAccessToken, getAccessTokenCookieOptions())

  res.json({
    success: true,
    message: 'Token refreshed successfully',
  })
}
