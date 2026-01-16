import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { getCSRFCookieOptions, COOKIE_NAMES } from '../config/cookies.js'

/**
 * @fileoverview CSRF (Cross-Site Request Forgery) Protection Middleware.
 *
 * Implements the Double-Submit Cookie Pattern for CSRF protection.
 *
 * How the Double-Submit Cookie Pattern Works:
 * 1. Server generates a random CSRF token and sets it in a non-httpOnly cookie
 *    (XSRF-TOKEN) so JavaScript can read it.
 * 2. Frontend reads the cookie and includes the token in the X-CSRF-Token header
 *    for all state-changing requests (POST, PUT, PATCH, DELETE).
 * 3. Server validates that the header value matches the cookie value.
 *
 * Why This Works:
 * - An attacker on evil.com cannot read cookies from our domain (Same-Origin Policy)
 * - Therefore, they cannot set the correct X-CSRF-Token header
 * - Even if they trigger a form submission, the header will be missing
 * - Combined with SameSite=strict, the cookie won't even be sent cross-site
 *
 * Token Rotation:
 * - Tokens are rotated on every successful state-changing request
 * - This limits the window of opportunity if a token is leaked
 * - Frontend should always read fresh token from cookie before requests
 *
 * Skipped Routes:
 * - GET/HEAD/OPTIONS: Safe methods that should not change state
 * - Login/Register: User doesn't have cookies yet
 * - Token refresh: Uses httpOnly refresh token (separate security)
 * - Stripe webhooks: Use signature verification instead
 *
 * @see {@link ../config/cookies.ts} for cookie configuration
 * @see {@link https://owasp.org/www-community/attacks/csrf} OWASP CSRF Guide
 */

/** Length of the CSRF token in bytes (32 bytes = 64 hex characters) */
const CSRF_TOKEN_LENGTH = 32

/** HTTP header name for the CSRF token (lowercase for case-insensitive matching) */
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generates a cryptographically secure random CSRF token.
 *
 * Uses Node.js crypto.randomBytes() which provides cryptographically strong
 * pseudo-random data suitable for security-sensitive operations.
 *
 * @returns {string} A 64-character hex string (32 bytes of entropy)
 *
 * @example
 * const token = generateCSRFToken()
 * // Returns something like: "a1b2c3d4e5f6..."
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Validates CSRF token using timing-safe comparison.
 *
 * Timing Attack Prevention:
 * A naive string comparison (===) returns early when it finds a mismatch.
 * This timing difference can leak information about how many characters matched.
 * An attacker could use this to guess the token one character at a time.
 *
 * crypto.timingSafeEqual() always takes the same amount of time regardless
 * of where the mismatch occurs, preventing timing attacks.
 *
 * Length Check:
 * timingSafeEqual() requires equal-length buffers, so we check length first.
 * The length check itself could leak information, but token length is not secret.
 *
 * @param headerToken - Token value from X-CSRF-Token header
 * @param cookieToken - Token value from XSRF-TOKEN cookie
 * @returns {boolean} True if tokens match, false otherwise
 */
function validateCSRFToken(headerToken: string | undefined, cookieToken: string | undefined): boolean {
  if (!headerToken || !cookieToken) {
    return false
  }

  // Ensure both tokens have the same length for timing-safe comparison
  if (headerToken.length !== cookieToken.length) {
    return false
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(headerToken, 'utf8'),
      Buffer.from(cookieToken, 'utf8')
    )
  } catch {
    return false
  }
}

/**
 * Express route handler to issue a new CSRF token.
 *
 * Endpoint: GET /api/csrf-token
 *
 * Use Cases:
 * - Frontend app initialization (before any POST requests)
 * - After CSRF token expiry (1 hour)
 * - After receiving 403 CSRF_TOKEN_INVALID error
 *
 * Response includes the token in both:
 * 1. XSRF-TOKEN cookie (for automatic browser inclusion)
 * 2. JSON response body (for immediate use in first request)
 *
 * Note: This endpoint is safe to call without authentication since
 * CSRF tokens are tied to the session via cookies, not user identity.
 *
 * @param _req - Express request (unused)
 * @param res - Express response
 *
 * @example
 * // Frontend initialization
 * const { data } = await api.get('/csrf-token')
 * // Token is now in cookie AND available in data.csrfToken
 */
export function csrfTokenEndpoint(_req: Request, res: Response): void {
  const token = generateCSRFToken()

  res.cookie(COOKIE_NAMES.CSRF_TOKEN, token, getCSRFCookieOptions())

  res.json({
    success: true,
    data: { csrfToken: token },
  })
}

/**
 * Express middleware for CSRF protection.
 *
 * Validates that the X-CSRF-Token header matches the XSRF-TOKEN cookie
 * for all state-changing HTTP methods (POST, PUT, PATCH, DELETE).
 *
 * Middleware Flow:
 * 1. Check if method is safe (GET/HEAD/OPTIONS) - skip validation
 * 2. Check if route is in skip list - skip validation
 * 3. Extract token from header and cookie
 * 4. Validate tokens match using timing-safe comparison
 * 5. On success: rotate token and continue
 * 6. On failure: return 403 with CSRF_TOKEN_INVALID error
 *
 * Token Rotation:
 * After each successful validation, a new token is issued. This limits
 * the damage if a token is leaked and provides forward secrecy.
 * The frontend should always read the fresh token from the cookie.
 *
 * Skipped Routes Rationale:
 * - login/register: User has no tokens yet (just received them)
 * - verify-email/forgot-password/reset-password: Public endpoints, no session
 * - refresh: Protected by httpOnly refresh token (XSS-safe)
 * - google/*: OAuth flow has its own state parameter protection
 * - payments/webhook: Stripe webhook signature verification
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * // Apply globally in server.ts
 * app.use(csrfProtection)
 *
 * // Frontend must include header
 * axios.post('/api/teams', data, {
 *   headers: { 'X-CSRF-Token': getCsrfTokenFromCookie() }
 * })
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip safe methods (they should be idempotent and not change state)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes(req.method)) {
    return next()
  }

  // Skip certain auth routes that don't have tokens yet or use other security
  const skipPaths = [
    '/api/auth/login',          // User receives CSRF token on successful login
    '/api/auth/register',       // User receives CSRF token on successful login
    '/api/auth/verify-email',   // Public endpoint, no session
    '/api/auth/forgot-password',// Public endpoint, no session
    '/api/auth/reset-password', // Public endpoint, no session
    '/api/auth/refresh',        // Uses httpOnly refresh token (XSS protection)
    '/api/auth/google',         // OAuth state parameter provides CSRF protection
    '/api/auth/google/callback',// OAuth state parameter provides CSRF protection
    '/api/payments/webhook',    // Stripe webhook signature verification
    '/api/admin/jobs',          // Admin-only, protected by JWT + requireAdmin middleware
  ]

  if (skipPaths.some(path => req.path === path || req.path.startsWith(path))) {
    return next()
  }

  const headerToken = req.get(CSRF_HEADER_NAME)
  const cookieToken = req.cookies?.[COOKIE_NAMES.CSRF_TOKEN]

  if (!validateCSRFToken(headerToken, cookieToken)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed. Please refresh the page and try again.',
      },
    })
    return
  }

  // Rotate token on successful validation (forward secrecy)
  // The frontend should read the new token from the XSRF-TOKEN cookie
  const newToken = generateCSRFToken()
  res.cookie(COOKIE_NAMES.CSRF_TOKEN, newToken, getCSRFCookieOptions())

  next()
}

/**
 * Express middleware to ensure a CSRF token cookie exists.
 *
 * Use Cases:
 * - After Google OAuth callback (user redirected, may not have token)
 * - As a safety net for routes that need CSRF tokens
 *
 * This middleware only sets a token if one doesn't already exist.
 * It does not validate or rotate existing tokens.
 *
 * Note: In most cases, tokens are set during login/OAuth callback.
 * This middleware is a fallback for edge cases.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * // Apply to specific routes that need CSRF token
 * router.get('/dashboard', authenticate, ensureCSRFToken, dashboardHandler)
 */
export function ensureCSRFToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[COOKIE_NAMES.CSRF_TOKEN]) {
    const token = generateCSRFToken()
    res.cookie(COOKIE_NAMES.CSRF_TOKEN, token, getCSRFCookieOptions())
  }
  next()
}
