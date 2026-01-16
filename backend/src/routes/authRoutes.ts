import { Router } from 'express'
import passport from '../config/passport.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'
import {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  logout,
  resendVerification,
  refreshToken,
} from '../controllers/authController.js'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getCSRFCookieOptions,
  COOKIE_NAMES,
} from '../config/cookies.js'
import { generateCSRFToken } from '../middleware/csrf.js'

/**
 * @fileoverview Authentication routes for user registration, login, and session management.
 *
 * Route Security Summary:
 * - Public routes (no auth): register, login, verify-email, forgot-password, reset-password, refresh
 * - Protected routes (require auth): logout, me, resend-verification
 * - OAuth routes: google, google/callback (Passport.js handles auth)
 *
 * CSRF Exemptions:
 * Most auth routes are exempt from CSRF validation because:
 * - Login/register: User has no session yet
 * - Token refresh: Uses httpOnly cookie (secure by itself)
 * - OAuth: Has its own state parameter protection
 *
 * Cookie Flow:
 * - Login/OAuth success: Sets access_token, refresh_token, XSRF-TOKEN cookies
 * - Logout: Clears all three cookies
 * - Refresh: Updates only access_token cookie
 *
 * @see {@link ../controllers/authController.ts} for handler implementations
 * @see {@link ../middleware/csrf.ts} for CSRF protection details
 */

const router = Router()

/**
 * POST /api/auth/register
 * Register new user with email and password.
 * Public endpoint - no auth required.
 * CSRF exempt - user has no session yet.
 */
router.post('/register', asyncHandler(register))

/**
 * POST /api/auth/verify-email
 * Verify email address using token from verification email.
 * Public endpoint - token provides authorization.
 * CSRF exempt - token is single-use and email-delivered.
 */
router.post('/verify-email', asyncHandler(verifyEmail))

/**
 * POST /api/auth/resend-verification
 * Resend verification email to authenticated user.
 * Protected - requires valid access token.
 */
router.post('/resend-verification', authenticate, asyncHandler(resendVerification))

/**
 * POST /api/auth/login
 * Authenticate with email/password, receive httpOnly cookies.
 * Public endpoint - credentials provide authorization.
 * CSRF exempt - user has no session yet.
 * Response sets: access_token, refresh_token, XSRF-TOKEN cookies.
 */
router.post('/login', asyncHandler(login))

/**
 * POST /api/auth/forgot-password
 * Request password reset email.
 * Public endpoint - always returns success (prevents enumeration).
 * CSRF exempt - no session, no state change for attacker benefit.
 */
router.post('/forgot-password', asyncHandler(forgotPassword))

/**
 * POST /api/auth/reset-password
 * Reset password using token from reset email.
 * Public endpoint - token provides authorization.
 * CSRF exempt - token is single-use and email-delivered.
 */
router.post('/reset-password', asyncHandler(resetPassword))

/**
 * POST /api/auth/logout
 * Clear all authentication cookies.
 * Protected - requires valid access token.
 * Note: Could be made public to clear stale cookies, but requiring
 * auth prevents logout CSRF attacks.
 */
router.post('/logout', authenticate, asyncHandler(logout))

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token cookie.
 * Public endpoint - refresh token in httpOnly cookie provides auth.
 * CSRF exempt - uses httpOnly cookie, attacker gains nothing.
 *
 * Security: Frontend should call this when access token expires (401).
 * The httpOnly refresh token cannot be stolen via XSS.
 */
router.post('/refresh', asyncHandler(refreshToken))

/**
 * GET /api/auth/me
 * Get current authenticated user's profile.
 * Protected - requires valid access token.
 * Used by frontend to restore session on page load.
 */
router.get('/me', authenticate, asyncHandler(getProfile))

/**
 * GET /api/auth/google
 * Initiates Google OAuth 2.0 authorization flow.
 *
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Frontend redirects to this endpoint
 * 3. Passport redirects to Google's authorization page
 * 4. User authorizes (or denies)
 * 5. Google redirects to /google/callback
 *
 * Scopes requested: profile, email
 * Session: false (stateless JWT auth)
 *
 * CSRF Protection: OAuth state parameter (handled by Passport)
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback after user authorizes.
 *
 * Security Implementation:
 * - Tokens set in httpOnly cookies (NOT in URL query params)
 * - Previous insecure pattern: redirect with ?token=xyz (XSS vulnerable)
 * - Current secure pattern: Set cookies, redirect without tokens
 *
 * Cookie Flow:
 * 1. Passport verifies OAuth response and creates/finds user
 * 2. This handler generates JWT tokens
 * 3. Sets access_token, refresh_token, XSRF-TOKEN cookies
 * 4. Redirects to frontend /dashboard (no tokens in URL)
 * 5. Frontend /dashboard calls /api/auth/me to get user data
 *
 * Error Handling:
 * - OAuth failure: Redirects to /login?error=google_auth_failed
 * - User can see error and retry or use email/password
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // Passport populates req.user with user data from Google strategy
    const user = req.user as any

    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    }

    // Generate all three tokens
    const accessToken = generateAccessToken(tokenPayload)
    const refreshTokenValue = generateRefreshToken(tokenPayload)
    const csrfToken = generateCSRFToken()

    // Set httpOnly cookies (secure - tokens never appear in URL or JS)
    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions())
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshTokenValue, getRefreshTokenCookieOptions())
    res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, getCSRFCookieOptions())

    // Redirect to frontend dashboard
    // Tokens are in cookies, not URL - browser auto-includes on next request
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    res.redirect(`${frontendUrl}/dashboard`)
  }
)

export default router
