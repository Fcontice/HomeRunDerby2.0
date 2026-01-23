/**
 * Cache Middleware
 * Adds HTTP cache headers to responses for browser and CDN caching
 *
 * Includes cache invalidation support via data version tracking.
 * After stats updates, call invalidateStatsCache() to bump the version,
 * causing browsers/CDNs to refetch fresh data.
 */

import { Request, Response, NextFunction } from 'express'

type CacheDuration = 'short' | 'medium' | 'long'

const CACHE_DURATIONS: Record<CacheDuration, number> = {
  short: 60,       // 1 minute - search results, frequently changing data
  medium: 300,     // 5 minutes - player lists, leaderboards
  long: 600,       // 10 minutes - season config, rarely changing data
}

/**
 * Data version for cache invalidation
 * Incremented after stats updates to invalidate cached responses
 */
let statsDataVersion = Date.now()

/**
 * Invalidate stats-related cache by bumping the data version
 * Call this after successful stats updates to ensure clients fetch fresh data
 *
 * How it works:
 * - Sets new data version timestamp
 * - All subsequent responses include updated ETag header
 * - Browsers/CDNs with old ETag will refetch instead of using stale cache
 */
export function invalidateStatsCache(): void {
  const previousVersion = statsDataVersion
  statsDataVersion = Date.now()
  console.log(`🔄 Cache invalidated: stats data version bumped from ${previousVersion} to ${statsDataVersion}`)
}

/**
 * Get current stats data version
 * Useful for debugging cache state
 */
export function getStatsDataVersion(): number {
  return statsDataVersion
}

/**
 * Creates cache middleware with specified duration
 * Sets Cache-Control header for public caching
 * Includes ETag based on data version for cache invalidation
 */
export function cache(duration: CacheDuration) {
  const maxAge = CACHE_DURATIONS[duration]

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate ETag based on data version and request path
    const etag = `"${statsDataVersion}-${req.path}"`

    // Check If-None-Match header for conditional requests
    const clientEtag = req.headers['if-none-match']
    if (clientEtag === etag) {
      // Client has current version, return 304 Not Modified
      res.status(304).end()
      return
    }

    // Set cache headers
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
    res.setHeader('ETag', etag)
    res.setHeader('X-Data-Version', statsDataVersion.toString())

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
