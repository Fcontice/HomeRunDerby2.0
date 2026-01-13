import jwt from 'jsonwebtoken'
import { vi } from 'vitest'

export const TEST_USER = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user' as const,
  emailVerified: true,
}

export const TEST_ADMIN = {
  id: 'test-admin-id-456',
  email: 'admin@example.com',
  username: 'adminuser',
  role: 'admin' as const,
  emailVerified: true,
}

export function generateTestToken(user: typeof TEST_USER | typeof TEST_ADMIN): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  )
}

export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  }
}

export function createMockResponse() {
  const res: Record<string, unknown> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}
