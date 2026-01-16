import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { authApi, User, setCSRFToken } from '../services/api'

/**
 * ============================================================================
 * AUTH CONTEXT - Secure Authentication State Management
 * ============================================================================
 *
 * This context manages user authentication state using httpOnly cookie-based
 * authentication. Key security principles:
 *
 * 1. **NO localStorage for tokens**
 *    - Tokens are stored in httpOnly cookies (set by backend)
 *    - JavaScript cannot access httpOnly cookies, preventing XSS token theft
 *    - Only user data (not tokens) is stored in React state
 *
 * 2. **Automatic Token Refresh**
 *    - Access tokens expire in 15 minutes (limits damage if compromised)
 *    - Proactive refresh every 10 minutes prevents session interruption
 *    - Refresh uses httpOnly refresh_token cookie (7 day expiry)
 *
 * 3. **CSRF Token Management**
 *    - CSRF token is stored in memory (setCSRFToken)
 *    - It's the only token JavaScript can access
 *    - Used for double-submit cookie pattern
 *
 * 4. **Session Initialization**
 *    - On mount, attempts to fetch user profile
 *    - If cookies are valid, user is restored without re-login
 *    - Browser sends cookies automatically with withCredentials: true
 *
 * ============================================================================
 */

/**
 * Type definition for the authentication context.
 *
 * @property user - Current authenticated user or null if not logged in
 * @property loading - True during initial auth check on app load
 * @property login - Authenticate with email/password
 * @property logout - Clear session (backend clears httpOnly cookies)
 * @property register - Create new account (does not auto-login)
 * @property setUser - Update user state (used after profile changes)
 * @property refreshUser - Fetch latest user data from server
 * @property isAuthenticated - Convenience boolean for auth checks
 */
interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Token refresh interval: 10 minutes (600,000 ms)
 *
 * @security Proactive refresh prevents access token from expiring during active use.
 * Access tokens expire in 15 minutes, so refreshing at 10 minutes gives a 5 minute buffer.
 * This ensures users don't experience session interruptions during normal usage.
 *
 * If refresh fails (e.g., refresh token expired), the user will be logged out
 * on their next API call when the response interceptor handles the 401.
 */
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000

/**
 * Authentication provider component that manages auth state for the application.
 *
 * @security_architecture
 * - User state is stored in React state (safe - just user profile data)
 * - Auth tokens are in httpOnly cookies (cannot be accessed by JavaScript)
 * - CSRF token is in memory via setCSRFToken (readable, but not a secret)
 *
 * @why_no_localstorage
 * localStorage is accessible to ANY JavaScript on the page. If an attacker
 * injects malicious code (XSS), they could steal tokens from localStorage.
 * httpOnly cookies are immune to JavaScript access, so XSS cannot steal them.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Start the proactive token refresh interval.
   *
   * @security Called after successful login or session restoration.
   * Ensures access tokens are refreshed before they expire, preventing
   * session interruption during active use.
   *
   * Note: Even if this fails, the response interceptor will handle 401s
   * by attempting refresh. This is just a proactive optimization.
   */
  const startTokenRefresh = () => {
    // Clear any existing interval to prevent duplicates
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    // Refresh token every 10 minutes (5 min before 15 min expiry)
    refreshIntervalRef.current = setInterval(async () => {
      try {
        await authApi.refreshToken()
        // New access_token cookie is set by backend automatically
      } catch (error) {
        console.error('Token refresh failed:', error)
        // Don't log out here - let the next API call handle it
        // The response interceptor will redirect to login if needed
      }
    }, TOKEN_REFRESH_INTERVAL)
  }

  /**
   * Stop the proactive token refresh interval.
   *
   * Called on logout and component unmount to prevent memory leaks
   * and unnecessary API calls after the user has logged out.
   */
  const stopTokenRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
  }

  /**
   * Initialize auth state on app load.
   *
   * @security_flow
   * 1. App loads - AuthProvider mounts
   * 2. Try to fetch /api/auth/me (cookies sent automatically)
   * 3. If valid access_token cookie exists, user profile is returned
   * 4. If no cookie or expired, 401 is returned (handled silently)
   *
   * This allows users to refresh the page without losing their session,
   * even though we never store tokens in JavaScript-accessible storage.
   *
   * @note The axios interceptor has /api/auth/me in skipRefreshPaths,
   * so it won't attempt token refresh on 401 here. This is intentional -
   * on initial load, if the access token is expired, we want to fail
   * silently and show the login page, not aggressively try to refresh.
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Browser sends httpOnly cookies automatically with withCredentials: true
        const response = await authApi.getProfile()
        if (response.success && response.data) {
          setUser(response.data.user)
          startTokenRefresh()
        }
      } catch (error) {
        // Not authenticated - this is normal for logged-out users
        // Could be: no cookies, expired access token, or invalid token
        console.debug('Not authenticated:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Cleanup: stop refresh interval when component unmounts
    return () => {
      stopTokenRefresh()
    }
  }, [])

  /**
   * Log in with email and password.
   *
   * @security_flow
   * 1. POST credentials to /api/auth/login
   * 2. Backend validates and sets httpOnly cookies (access_token, refresh_token)
   * 3. Backend also sets XSRF-TOKEN cookie (readable) for CSRF protection
   * 4. Response contains user profile and CSRF token
   * 5. We store CSRF token in memory and user in state
   * 6. Start proactive token refresh interval
   *
   * @note The actual auth tokens NEVER touch JavaScript - they go directly
   * into httpOnly cookies that the browser manages. Only the CSRF token
   * (which is not a secret) is exposed to JavaScript.
   */
  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password })

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Login failed')
    }

    const { user, csrfToken } = response.data

    // Store CSRF token in memory for the request interceptor to use
    // This is the ONLY token JavaScript can access (intentionally not httpOnly)
    if (csrfToken) {
      setCSRFToken(csrfToken)
    }

    // httpOnly cookies (access_token, refresh_token) are set by the browser automatically
    // We never see or handle these tokens in JavaScript - that's the security benefit
    setUser(user)
    startTokenRefresh()
  }

  /**
   * Register a new user account.
   *
   * @security Does NOT automatically log in the user. This is intentional:
   * - Requires email verification before accessing authenticated features
   * - Prevents account enumeration attacks
   * - Ensures the email owner controls the account
   */
  const register = async (email: string, username: string, password: string) => {
    const response = await authApi.register({ email, username, password })

    if (!response.success) {
      throw new Error(response.error?.message || 'Registration failed')
    }

    // User must verify email before logging in - don't set any state here
  }

  /**
   * Refresh the user profile from the server.
   *
   * Useful after profile updates to ensure React state matches server state.
   * Uses existing auth cookies to fetch current user data.
   */
  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile()
      if (response.success && response.data) {
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error)
    }
  }

  /**
   * Log out the current user.
   *
   * @security_flow
   * 1. POST to /api/auth/logout
   * 2. Backend clears httpOnly cookies (access_token, refresh_token, XSRF-TOKEN)
   * 3. We clear CSRF token from memory and user from state
   * 4. Stop the proactive token refresh interval
   *
   * @note We clear local state even if the API call fails, because:
   * - The user wants to log out regardless of server response
   * - Server cookies will expire on their own eventually
   * - Keeps UI in sync with user intent
   *
   * @why_server_clears_cookies httpOnly cookies can ONLY be cleared by the
   * server (or by expiration). JavaScript cannot access them to delete them.
   * The backend sets Max-Age=0 to tell the browser to remove them.
   */
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clean up local state, even if API call failed
      stopTokenRefresh()
      // Clear CSRF token from memory (the only token we can access)
      setCSRFToken(null)
      // Clear user from React state - httpOnly cookies are cleared by server
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    setUser,
    refreshUser,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication state and actions.
 *
 * @returns AuthContextType with user state and auth methods
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <LoginForm onSubmit={login} />
 *   }
 *
 *   return <div>Welcome, {user?.username}!</div>
 * }
 *
 * @security_note The user object contains profile data only, never tokens.
 * Auth tokens are in httpOnly cookies managed by the browser.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
