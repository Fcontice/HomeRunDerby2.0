/**
 * Player Cache Service
 * In-memory cache for player list data to reduce database load
 * Players change infrequently (daily stats update), so caching is effective
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class PlayerCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.TTL)
    this.cache.set(key, { data, expiresAt })
  }

  /**
   * Generate cache key from query params
   */
  generateKey(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&')
    return `players:${sortedParams}`
  }

  /**
   * Invalidate all player cache entries
   * Call this after daily stats updates
   */
  invalidate(): void {
    this.cache.clear()
    console.log('🗑️  Player cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Singleton instance
export const playerCache = new PlayerCache()
