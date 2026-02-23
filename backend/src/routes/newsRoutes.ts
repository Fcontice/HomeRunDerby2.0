import express from 'express'
import { getDailyNews } from '../controllers/newsController.js'
import { cache } from '../middleware/cache.js'

const router = express.Router()

// GET /api/news/daily - Get daily news digest (public, cached 5 min)
router.get('/daily', cache('medium'), getDailyNews)

export default router
