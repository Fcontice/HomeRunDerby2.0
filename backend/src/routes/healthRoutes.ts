import { Router } from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const execPromise = promisify(exec)
const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Health check endpoint for Python environment
 * GET /health/python
 *
 * Tests:
 * - Python availability
 * - Python dependencies (MLB-StatsAPI, supabase)
 * - Database connectivity
 */
router.get('/python', async (req, res) => {
  try {
    const testScriptPath = path.join(
      __dirname,
      '../scripts/python/test_connection.py'
    )

    const { stdout } = await execPromise(
      `python "${testScriptPath}"`,
      { timeout: 10000 }  // 10 second timeout
    )

    // If we get here, Python + dependencies work
    res.json({
      success: true,
      message: 'Python environment healthy',
      details: {
        pythonAvailable: true,
        supabaseConnection: stdout.includes('✓') || stdout.includes('Success'),
      }
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'PYTHON_HEALTH_CHECK_FAILED',
        message: 'Python environment check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
})

/**
 * General health check endpoint
 * GET /health
 *
 * Returns basic API health status
 */
router.get('/', async (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})

export default router
