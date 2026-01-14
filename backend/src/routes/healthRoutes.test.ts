import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import healthRoutes from './healthRoutes.js'

// Create test app
const app = express()
app.use('/health', healthRoutes)

describe('Health Routes', () => {
  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('API is healthy')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('environment')
    })

    it('should return valid timestamp in ISO format', async () => {
      const response = await request(app).get('/health')

      const timestamp = new Date(response.body.timestamp)
      expect(timestamp.toISOString()).toBe(response.body.timestamp)
    })

    it('should return numeric uptime', async () => {
      const response = await request(app).get('/health')

      expect(typeof response.body.uptime).toBe('number')
      expect(response.body.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  // Note: /health/python tests are skipped because they require Python runtime
  // These should be tested in integration tests with proper Python environment
  describe('GET /health/python', () => {
    it.skip('should check Python environment (requires Python)', async () => {
      const response = await request(app).get('/health/python')
      // This test requires actual Python installation
      expect([200, 503]).toContain(response.status)
    })
  })
})
