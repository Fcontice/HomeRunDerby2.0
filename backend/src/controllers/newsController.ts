/**
 * News Controller
 * Handles API requests for the daily news digest
 */

import { Request, Response, NextFunction } from 'express'
import { db } from '../services/db.js'

/**
 * GET /api/news/daily
 * Get the daily news digest.
 * Defaults to yesterday; falls back to the day before if no items found.
 *
 * Query params:
 *   - date: string (YYYY-MM-DD, optional)
 *   - category: 'hr' | 'injury' | 'trade' (optional filter)
 *   - limit: number (default 50)
 */
export async function getDailyNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, category, limit = '50' } = req.query
    const take = Math.min(parseInt(limit as string, 10) || 50, 100)

    // Default to yesterday's date
    let dateKey: string
    if (date) {
      dateKey = date as string
    } else {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      dateKey = yesterday.toISOString().split('T')[0]
    }

    const where: Record<string, unknown> = { dateKey }
    if (category) where.category = category as string

    let items = await db.newsItem.findMany(where, {
      orderBy: { createdAt: 'desc' },
      take,
    })

    let usedDate = dateKey

    // If no items for this date and no explicit date was requested, try the day before
    if (items.length === 0 && !date) {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      usedDate = twoDaysAgo.toISOString().split('T')[0]

      const fallbackWhere: Record<string, unknown> = { dateKey: usedDate }
      if (category) fallbackWhere.category = category as string

      items = await db.newsItem.findMany(fallbackWhere, {
        orderBy: { createdAt: 'desc' },
        take,
      })
    }

    res.json({
      success: true,
      data: {
        items,
        date: usedDate,
        counts: {
          hr: items.filter(i => i.category === 'hr').length,
          injury: items.filter(i => i.category === 'injury').length,
          trade: items.filter(i => i.category === 'trade').length,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
