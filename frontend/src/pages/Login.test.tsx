import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/testUtils'
import userEvent from '@testing-library/user-event'
import Login from './Login'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useAuth
const mockLogin = vi.fn()
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}))

// Mock authApi
vi.mock('../services/api', () => ({
  authApi: {
    googleLogin: vi.fn(),
  },
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the login form', () => {
      render(<Login />)

      expect(screen.getByText('Home Run Derby')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders Google login button', () => {
      render(<Login />)

      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('renders link to register page', () => {
      render(<Login />)

      const signUpLink = screen.getByRole('link', { name: /sign up/i })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/register')
    })

    it('renders forgot password link', () => {
      render(<Login />)

      const forgotLink = screen.getByRole('link', { name: /forgot password/i })
      expect(forgotLink).toBeInTheDocument()
      expect(forgotLink).toHaveAttribute('href', '/forgot-password')
    })
  })

  describe('Form Validation', () => {
    it('does not call login with invalid email', async () => {
      const user = userEvent.setup()
      render(<Login />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Type invalid email and valid password
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'somepassword')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Wait a bit for any async operations
      await waitFor(() => {
        // Login should NOT have been called due to validation failure
        expect(mockLogin).not.toHaveBeenCalled()
      })
    })

    it('does not call login when password is empty', async () => {
      const user = userEvent.setup()
      render(<Login />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      // Wait a bit for any async operations
      await waitFor(() => {
        // Login should NOT have been called due to validation failure
        expect(mockLogin).not.toHaveBeenCalled()
      })
    })
  })

  describe('Login Submission', () => {
    it('calls login with email and password on valid submission', async () => {
      mockLogin.mockResolvedValueOnce(undefined)
      const user = userEvent.setup()
      render(<Login />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('navigates to dashboard on successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined)
      const user = userEvent.setup()
      render(<Login />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('displays error message on login failure', async () => {
      mockLogin.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid credentials' },
          },
        },
      })
      const user = userEvent.setup()
      render(<Login />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('displays generic error for unknown errors', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Network error'))
      const user = userEvent.setup()
      render(<Login />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('disables form inputs while loading', async () => {
      // Make login hang to simulate loading
      mockLogin.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      )
      const user = userEvent.setup()
      render(<Login />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
      })
    })

    it('shows loading text on button while submitting', async () => {
      mockLogin.mockImplementationOnce(
        () => new Promise(() => {})
      )
      const user = userEvent.setup()
      render(<Login />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })
    })
  })

  describe('Google Login', () => {
    it('calls googleLogin when Google button is clicked', async () => {
      const { authApi } = await import('../services/api')
      const user = userEvent.setup()
      render(<Login />)

      const googleButton = screen.getByRole('button', { name: /google/i })
      await user.click(googleButton)

      expect(authApi.googleLogin).toHaveBeenCalled()
    })
  })
})
