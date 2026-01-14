import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors.js'
import { ZodError } from 'zod'

/**
 * PostgreSQL/Supabase error interface
 */
interface PostgrestError {
  code?: string
  message?: string
  details?: string
}

/**
 * Global error handling middleware
 * Must be registered last in middleware chain
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging (in production, use proper logging service)
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  })

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    })
    return
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    })
    return
  }

  // Handle PostgreSQL/Supabase errors (via code property)
  const pgError = err as unknown as PostgrestError
  if (pgError && typeof pgError === 'object' && 'code' in pgError && typeof pgError.code === 'string') {
    // Unique constraint violation (PostgreSQL error code 23505)
    if (pgError.code === '23505') {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Record already exists',
        },
      })
      return
    }

    // Foreign key constraint violation (PostgreSQL error code 23503)
    if (pgError.code === '23503') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid reference to related record',
        },
      })
      return
    }

    // Not null violation (PostgreSQL error code 23502)
    if (pgError.code === '23502') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required field is missing',
        },
      })
      return
    }

    // Record not found (Supabase PGRST116)
    if (pgError.code === 'PGRST116') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      })
      return
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Invalid token',
      },
    })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Token expired',
      },
    })
    return
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    },
  })
}

/**
 * 404 Not Found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  })
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
