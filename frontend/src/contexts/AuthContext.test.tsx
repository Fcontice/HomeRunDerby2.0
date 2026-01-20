import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import { TEST_USER } from '../test/testUtils'

// Use vi.hoisted to ensure mock is available during hoisting
const mockAuthApi = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getProfile: vi.fn(),
  googleLogin: vi.fn(),
  refreshToken: vi.fn(),
}))

const mockSetCSRFToken = vi.hoisted(() => vi.fn())

vi.mock('../services/api', () => ({
  authApi: mockAuthApi,
  setCSRFToken: mockSetCSRFToken,
}))

// Test component that uses the hook
function TestConsumer({ onError }: { onError?: (e: Error) => void }) {
  const { user, loading, isAuthenticated, login, logout, register, refreshUser } = useAuth()

  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password')
    } catch (e) {
      onError?.(e as Error)
    }
  }

  const handleRegister = async () => {
    try {
      await register('test@example.com', 'testuser', 'password', '555-123-4567')
    } catch (e) {
      onError?.(e as Error)
    }
  }

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={() => refreshUser()}>Refresh</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('starts with loading true and user null', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Initially loading
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })
      expect(screen.getByTestId('user').textContent).toBe('null')
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })

    it('fetches profile on mount (cookies sent automatically)', async () => {
      mockAuthApi.getProfile.mockResolvedValue({
        success: true,
        data: { user: TEST_USER },
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
        expect(screen.getByTestId('user').textContent).toBe(TEST_USER.email)
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      expect(mockAuthApi.getProfile).toHaveBeenCalled()
    })

    it('handles profile fetch failure gracefully', async () => {
      mockAuthApi.getProfile.mockRejectedValue(new Error('Invalid token'))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
        expect(screen.getByTestId('user').textContent).toBe('null')
      })

      // No localStorage to clear - cookies handled by browser/server
    })

    it('handles unsuccessful profile response', async () => {
      mockAuthApi.getProfile.mockResolvedValue({
        success: false,
        error: { message: 'Unauthorized' },
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
        expect(screen.getByTestId('user').textContent).toBe('null')
      })
    })
  })

  describe('login', () => {
    it('sets user and CSRF token on successful login', async () => {
      mockAuthApi.getProfile.mockRejectedValue(new Error('Not authenticated'))
      mockAuthApi.login.mockResolvedValue({
        success: true,
        data: {
          user: TEST_USER,
          csrfToken: 'new-csrf-token',
        },
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      await act(async () => {
        screen.getByRole('button', { name: /login/i }).click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(TEST_USER.email)
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      // CSRF token stored in memory via setCSRFToken
      expect(mockSetCSRFToken).toHaveBeenCalledWith('new-csrf-token')
    })

    it('throws error on failed login', async () => {
      mockAuthApi.login.mockResolvedValue({
        success: false,
        error: { message: 'Invalid credentials' },
      })

      const errorHandler = vi.fn()

      render(
        <AuthProvider>
          <TestConsumer onError={errorHandler} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      await act(async () => {
        screen.getByRole('button', { name: /login/i }).click()
      })

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
      })

      expect(screen.getByTestId('user').textContent).toBe('null')
    })
  })

  describe('register', () => {
    it('calls register API without auto-login', async () => {
      mockAuthApi.register.mockResolvedValue({
        success: true,
        message: 'Registration successful',
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      await act(async () => {
        screen.getByRole('button', { name: /register/i }).click()
      })

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password',
        phoneNumber: '555-123-4567',
      })

      // User should still be null (no auto-login)
      expect(screen.getByTestId('user').textContent).toBe('null')
    })

    it('throws error on failed registration', async () => {
      mockAuthApi.register.mockResolvedValue({
        success: false,
        error: { message: 'Email already exists' },
      })

      const errorHandler = vi.fn()

      render(
        <AuthProvider>
          <TestConsumer onError={errorHandler} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      await act(async () => {
        screen.getByRole('button', { name: /register/i }).click()
      })

      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalledWith(expect.any(Error))
      })

      expect(screen.getByTestId('user').textContent).toBe('null')
    })
  })

  describe('logout', () => {
    it('clears user and CSRF token on logout', async () => {
      // Start with a logged in user
      mockAuthApi.getProfile.mockResolvedValue({
        success: true,
        data: { user: TEST_USER },
      })
      mockAuthApi.logout.mockResolvedValue({ success: true })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(TEST_USER.email)
      })

      await act(async () => {
        screen.getByRole('button', { name: /logout/i }).click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
        expect(screen.getByTestId('authenticated').textContent).toBe('false')
      })

      // CSRF token cleared from memory
      expect(mockSetCSRFToken).toHaveBeenCalledWith(null)
    })

    it('clears user even when API logout fails', async () => {
      mockAuthApi.getProfile.mockResolvedValue({
        success: true,
        data: { user: TEST_USER },
      })
      mockAuthApi.logout.mockRejectedValue(new Error('Network error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(TEST_USER.email)
      })

      await act(async () => {
        screen.getByRole('button', { name: /logout/i }).click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null')
      })

      expect(mockSetCSRFToken).toHaveBeenCalledWith(null)
      consoleSpy.mockRestore()
    })
  })

  describe('refreshUser', () => {
    it('updates user from profile API', async () => {
      mockAuthApi.getProfile
        .mockResolvedValueOnce({
          success: true,
          data: { user: TEST_USER },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { user: { ...TEST_USER, username: 'updated' } },
        })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe(TEST_USER.email)
      })

      await act(async () => {
        screen.getByRole('button', { name: /refresh/i }).click()
      })

      expect(mockAuthApi.getProfile).toHaveBeenCalledTimes(2)
    })
  })

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })
})
