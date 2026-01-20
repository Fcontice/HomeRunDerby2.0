/**
 * Leaderboard Cache Service
 * In-memory cache for leaderboard data to reduce database load
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class LeaderboardCache {
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
   * Invalidate cache entries by pattern
   * @param pattern - Optional prefix pattern to match. If not provided, clears all cache.
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      console.log('🗑️  Leaderboard cache cleared')
      return
    }

    const keysToDelete: string[] = []
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
    if (keysToDelete.length > 0) {
      console.log(`🗑️  Invalidated ${keysToDelete.length} cache entries matching "${pattern}"`)
    }
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
export const leaderboardCache = new LeaderboardCache()
