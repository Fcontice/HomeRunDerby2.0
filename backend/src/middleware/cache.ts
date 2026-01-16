/**
 * Cache Middleware
 * Adds HTTP cache headers to responses for browser and CDN caching
 */

import { Request, Response, NextFunction } from 'express'

type CacheDuration = 'short' | 'medium' | 'long'

const CACHE_DURATIONS: Record<CacheDuration, number> = {
  short: 60,       // 1 minute - search results, frequently changing data
  medium: 300,     // 5 minutes - player lists, leaderboards
  long: 600,       // 10 minutes - season config, rarely changing data
}

/**
 * Creates cache middleware with specified duration
 * Sets Cache-Control header for public caching
 */
export function cache(duration: CacheDuration) {
  const maxAge = CACHE_DURATIONS[duration]

  return (_req: Request, res: Response, next: NextFunction) => {
    // Set cache header for successful GET requests
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
    next()
  }
}

/**
 * Middleware to prevent caching (for user-specific or sensitive data)
 */
export function noCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  next()
}
