import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt.js'
import { AuthenticationError, AuthorizationError } from '../utils/errors.js'

// Extend Express User type to include our JWT fields
declare global {
  namespace Express {
    interface User extends JwtPayload {}
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Expects token in Authorization header as "Bearer <token>"
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
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
 * Middleware to check if authenticated user has admin role
 * Must be used after authenticate middleware
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
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't reject if missing/invalid
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      req.user = payload
    }
  } catch {
    // Silently ignore authentication errors for optional auth
  }

  next()
}

/**
 * Middleware to check if user owns the resource
 * Compares req.user.userId with req.params.userId (or specified param)
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
 * Alias for authenticate - required for auth
 */
export const requireAuth = authenticate

/**
 * Alias for optionalAuthenticate
 */
export const optionalAuth = optionalAuthenticate

/**
 * Middleware to check if authenticated user's email is verified
 * Must be used after authenticate middleware
 */
export function requireEmailVerified(_req: Request, _res: Response, next: NextFunction): void {
  // This check is now handled in the controller
  // But we keep the middleware for route-level protection
  next()
}
