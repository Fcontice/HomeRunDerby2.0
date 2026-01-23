import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt.js'
import { AuthenticationError, AuthorizationError } from '../utils/errors.js'
import { COOKIE_NAMES } from '../config/cookies.js'
import { db } from '../services/db.js'

/**
 * @fileoverview Authentication middleware for JWT-based access control.
 *
 * Token Extraction Priority:
 * 1. httpOnly cookie (primary) - Used by browser clients, XSS-protected
 * 2. Authorization header (fallback) - Used by API clients, mobile apps
 *
 * Security Considerations:
 * - httpOnly cookies are preferred because they cannot be stolen via XSS
 * - Authorization header is supported for non-browser clients (CLI, mobile)
 * - Both methods use the same JWT verification logic
 *
 * Middleware Chain:
 * - authenticate: Requires valid token, fails with 401 if missing/invalid
 * - optionalAuth: Attaches user if valid token, continues if not
 * - requireAdmin: Checks user.role === 'admin' after authenticate
 * - requireOwnership: Checks user owns resource after authenticate
 *
 * @see {@link ../config/cookies.ts} for cookie configuration
 * @see {@link ../utils/jwt.ts} for token generation and verification
 */

/**
 * Extend Express User type to include our JWT payload fields.
 * This allows TypeScript to recognize req.user properties.
 */
declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}

/**
 * Extracts JWT access token from the request.
 *
 * Extraction Priority:
 * 1. httpOnly cookie (access_token) - Primary method for browser clients
 *    - More secure: Cannot be stolen via XSS attacks
 *    - Automatically sent by browser with credentials: 'include'
 *
 * 2. Authorization header (Bearer token) - Fallback for non-browser clients
 *    - Used by: API clients, CLI tools, mobile apps, Postman
 *    - Format: "Authorization: Bearer <token>"
 *    - Less secure in browsers due to XSS risk (token in JS memory)
 *
 * Why Cookie First?
 * In a browser context, if both cookie and header are present, we prefer
 * the cookie because it's httpOnly (protected from XSS). The header might
 * contain a token that was stored in localStorage by a third-party script.
 *
 * @param req - Express request object
 * @returns {string | null} The JWT token, or null if not found
 */
function extractToken(req: Request): string | null {
  // Priority 1: Check httpOnly cookie (primary method for browser clients)
  const cookieToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]
  if (cookieToken) {
    return cookieToken
  }

  // Priority 2: Check Authorization header (fallback for API clients, mobile apps)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  return null
}

/**
 * Express middleware that requires authentication.
 *
 * This middleware:
 * 1. Extracts JWT from cookie or Authorization header
 * 2. Verifies the token signature and expiration
 * 3. Attaches decoded payload to req.user
 * 4. Passes to next middleware on success
 * 5. Passes AuthenticationError to error handler on failure
 *
 * Use this middleware on routes that require a logged-in user.
 * For routes where auth is optional, use optionalAuth instead.
 *
 * Error Cases:
 * - No token: 401 "No token provided"
 * - Invalid/expired token: 401 "Invalid or expired token"
 *
 * @param req - Express request
 * @param _res - Express response (unused)
 * @param next - Express next function
 *
 * @example
 * // Protect a route
 * router.get('/me', authenticate, getProfile)
 *
 * // Access user in handler
 * function getProfile(req: Request, res: Response) {
 *   const userId = req.user.userId // TypeScript knows this exists
 * }
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req)

    if (!token) {
      throw new AuthenticationError('No token provided')
    }

    const payload = verifyToken(token)

    // Attach user info to request object
    req.user = payload
    next()
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired token') {
      next(new AuthenticationError('Invalid or expired token'))
    } else {
      next(error)
    }
  }
}

/**
 * Express middleware that requires admin role.
 *
 * Prerequisites: Must be used AFTER authenticate middleware.
 *
 * Checks that req.user exists and has role === 'admin'.
 * Returns 403 Forbidden if user is not an admin.
 *
 * Note: Admin role is set in the User table and included in JWT payload.
 * To make a user admin: UPDATE "User" SET role = 'admin' WHERE id = '...'
 *
 * @param req - Express request (must have req.user from authenticate)
 * @param _res - Express response (unused)
 * @param next - Express next function
 *
 * @example
 * // Admin-only route
 * router.get('/admin/stats', authenticate, requireAdmin, getAdminStats)
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AuthenticationError())
    return
  }

  if (req.user.role !== 'admin') {
    next(new AuthorizationError('Admin access required'))
    return
  }

  next()
}

/**
 * Express middleware for optional authentication.
 *
 * Unlike authenticate, this middleware:
 * - Does NOT fail if token is missing
 * - Does NOT fail if token is invalid/expired
 * - Attaches user to req.user if token is valid
 * - Allows request to proceed regardless
 *
 * Use Cases:
 * - Public endpoints that show extra data for logged-in users
 * - Endpoints where auth provides personalization but isn't required
 *
 * @param req - Express request
 * @param _res - Express response (unused)
 * @param next - Express next function
 *
 * @example
 * // Public endpoint with optional user context
 * router.get('/players', optionalAuth, listPlayers)
 *
 * function listPlayers(req: Request, res: Response) {
 *   if (req.user) {
 *     // Show user's favorite players first
 *   }
 * }
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req)

    if (token) {
      const payload = verifyToken(token)
      req.user = payload
    }
  } catch {
    // Silently ignore authentication errors for optional auth
  }

  next()
}

/**
 * Express middleware factory that requires resource ownership.
 *
 * Creates middleware that checks if the authenticated user owns the resource.
 * Compares req.user.userId with req.params[paramName].
 *
 * Admin Override: Users with role === 'admin' bypass ownership check.
 *
 * Prerequisites: Must be used AFTER authenticate middleware.
 *
 * @param paramName - Route parameter containing the resource owner's user ID
 *                    Defaults to 'userId'. For team routes, might be 'teamUserId'.
 * @returns Express middleware function
 *
 * @example
 * // User can only access their own data
 * router.get('/users/:userId/teams', authenticate, requireOwnership('userId'), getUserTeams)
 *
 * // For nested resources
 * router.delete('/teams/:teamId', authenticate, requireOwnership('teamUserId'), deleteTeam)
 */
export function requireOwnership(paramName: string = 'userId'): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError())
      return
    }

    const resourceUserId = req.params[paramName]

    if (req.user.userId !== resourceUserId && req.user.role !== 'admin') {
      next(
        new AuthorizationError(
          'You do not have permission to access this resource'
        )
      )
      return
    }

    next()
  }
}

/**
 * Alias for authenticate middleware.
 * Use when you want semantically clear code: "this route requires auth".
 */
export const requireAuth = authenticate

/**
 * Alias for optionalAuthenticate middleware.
 * Use when you want semantically clear code: "auth is optional here".
 */
export const optionalAuth = optionalAuthenticate

/**
 * Express middleware that requires the user's email to be verified.
 *
 * Prerequisites: Must be used AFTER authenticate middleware.
 *
 * Checks that req.user exists and queries the database to verify
 * the user's email is verified. Returns 403 if not verified.
 *
 * @param req - Express request (must have req.user from authenticate)
 * @param _res - Express response (unused)
 * @param next - Express next function
 *
 * @example
 * // Require verified email for team creation
 * router.post('/teams', authenticate, requireEmailVerified, createTeam)
 */
export async function requireEmailVerified(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      next(new AuthenticationError('Authentication required'))
      return
    }

    const user = await db.user.findUnique({ id: req.user.userId })

    if (!user) {
      next(new AuthenticationError('User not found'))
      return
    }

    if (!user.emailVerified) {
      next(new AuthorizationError('Email must be verified'))
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}
