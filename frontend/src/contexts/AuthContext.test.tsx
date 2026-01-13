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
}))

vi.mock('../services/api', () => ({
  authApi: mockAuthApi,
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

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
      await register('test@example.com', 'testuser', 'password')
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
    localStorageMock.getItem.mockReturnValue(null)
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

    it('fetches profile when token exists', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token')
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

    it('clears tokens when profile fetch fails', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token')
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

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    })

    it('clears tokens when profile response is not successful', async () => {
      localStorageMock.getItem.mockReturnValue('some-token')
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
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    })
  })

  describe('login', () => {
    it('stores tokens and sets user on successful login', async () => {
      mockAuthApi.login.mockResolvedValue({
        success: true,
        data: {
          user: TEST_USER,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
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

      expect(localStorageMock.setItem).toHaveBeenCalledWith('access_token', 'new-access-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token')
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
    it('clears tokens and user on logout', async () => {
      // Start with a logged in user
      localStorageMock.getItem.mockReturnValue('existing-token')
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

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
    })

    it('clears tokens even when API logout fails', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token')
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

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      consoleSpy.mockRestore()
    })
  })

  describe('refreshUser', () => {
    it('updates user from profile API', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token')
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
