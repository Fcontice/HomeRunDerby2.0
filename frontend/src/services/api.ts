import axios, { AxiosInstance, AxiosError } from 'axios'

/**
 * ============================================================================
 * FRONTEND SECURITY ARCHITECTURE
 * ============================================================================
 *
 * This module implements a secure authentication system using httpOnly cookies
 * with CSRF protection. Key security features:
 *
 * 1. **httpOnly Cookies for Tokens (XSS Protection)**
 *    - Access and refresh tokens are stored in httpOnly cookies
 *    - JavaScript cannot access these tokens, preventing XSS attacks from stealing them
 *    - Tokens are automatically sent with requests via `withCredentials: true`
 *
 * 2. **Why NOT localStorage?**
 *    - localStorage is accessible to any JavaScript running on the page
 *    - An XSS vulnerability would allow attackers to steal tokens
 *    - httpOnly cookies are immune to JavaScript access
 *
 * 3. **CSRF Protection (Double-Submit Cookie Pattern)**
 *    - XSRF-TOKEN cookie is NOT httpOnly (frontend can read it)
 *    - Token is sent in X-CSRF-Token header on state-changing requests
 *    - Backend validates that cookie and header values match
 *    - Attackers cannot read cross-origin cookies, so they can't set the header
 *
 * 4. **Token Refresh Mechanism**
 *    - Access tokens expire in 15 minutes (limits exposure if compromised)
 *    - Refresh tokens last 7 days (stored in separate httpOnly cookie)
 *    - Automatic refresh happens 5 minutes before expiry
 *    - Subscriber pattern prevents race conditions during refresh
 *
 * 5. **SameSite Cookie Policy**
 *    - Cookies use SameSite=strict (only sent to same site)
 *    - Provides additional CSRF protection at the browser level
 *
 * ============================================================================
 */

const API_URL = (import.meta as any).env.VITE_API_URL || ''

/**
 * CSRF token stored in memory for quick access.
 *
 * @security The CSRF token is also stored in the XSRF-TOKEN cookie (NOT httpOnly
 * so JavaScript can read it). We cache it in memory to avoid parsing cookies
 * on every request. This token is sent in the X-CSRF-Token header for
 * state-changing requests (POST, PATCH, DELETE).
 *
 * @why Memory storage is safe because:
 * - The CSRF token is not a secret (it's readable from cookies anyway)
 * - It only proves that the request came from our frontend, not a CSRF attack
 * - Attackers can't read our cookies cross-origin, so they can't forge the header
 */
let csrfToken: string | null = null

/**
 * Token refresh state management.
 *
 * @pattern Subscriber Pattern for Concurrent Request Handling
 *
 * When multiple API calls fail with 401 simultaneously (e.g., dashboard loads
 * teams, users, and stats at once), we need to ensure only ONE refresh request
 * is made, and all pending requests retry after it succeeds.
 *
 * Without this pattern:
 * - 3 concurrent 401s would trigger 3 refresh requests
 * - Race conditions could lead to token corruption
 * - Users might get logged out unnecessarily
 *
 * With this pattern:
 * - First 401 triggers refresh, sets isRefreshing=true
 * - Subsequent 401s subscribe to refreshSubscribers array
 * - When refresh completes, all subscribers are notified
 * - All original requests retry with the new token
 */
let isRefreshing = false
let refreshSubscribers: ((success: boolean) => void)[] = []

/**
 * Queue a callback to be notified when the current token refresh completes.
 *
 * @internal Used by the response interceptor to handle concurrent 401 errors
 * @param onComplete - Callback that receives true if refresh succeeded, false otherwise
 *
 * @example
 * // Called when a request fails with 401 while another refresh is in progress
 * subscribeToRefresh((success) => {
 *   if (success) resolve(api(originalRequest))
 *   else reject(error)
 * })
 */
function subscribeToRefresh(onComplete: (success: boolean) => void): void {
  refreshSubscribers.push(onComplete)
}

/**
 * Notify all queued requests that the token refresh has completed.
 *
 * @internal Called after refresh succeeds or fails
 * @param success - Whether the refresh was successful
 */
function onRefreshComplete(success: boolean): void {
  refreshSubscribers.forEach(callback => callback(success))
  refreshSubscribers = []
}

/**
 * Extract CSRF token from the XSRF-TOKEN cookie.
 *
 * @internal Used as a fallback when the in-memory token is not set
 * @returns The CSRF token value or null if not found
 *
 * @security The XSRF-TOKEN cookie is intentionally NOT httpOnly so that
 * JavaScript can read it. This is safe because:
 * - The token's purpose is to prove requests come from our frontend
 * - It's not a secret - it just needs to match between cookie and header
 * - Attackers can't read cross-origin cookies to forge the header
 */
function getCSRFTokenFromCookie(): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split('; XSRF-TOKEN=')
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

/**
 * Update the in-memory CSRF token.
 *
 * Called after successful login or when the token is refreshed. The token is
 * typically received in the login response and also set as a cookie by the backend.
 *
 * @param token - The new CSRF token value, or null to clear it
 *
 * @security This function is exported so AuthContext can set the token after login.
 * The token is safe to store in memory because it's not a secret - it's also
 * readable from the XSRF-TOKEN cookie.
 */
export function setCSRFToken(token: string | null): void {
  csrfToken = token
}

/**
 * Get the current CSRF token for use in request headers.
 *
 * Attempts to retrieve the token from memory first (faster), then falls back
 * to parsing the XSRF-TOKEN cookie if the in-memory value is not set.
 *
 * @returns The CSRF token value or null if not available
 *
 * @example
 * // The request interceptor calls this automatically for non-GET requests
 * const token = getCSRFToken()
 * if (token) {
 *   headers['X-CSRF-Token'] = token
 * }
 */
export function getCSRFToken(): string | null {
  // Try memory first, then cookie
  return csrfToken || getCSRFTokenFromCookie()
}

/**
 * Configured axios instance with security features enabled.
 *
 * @security Configuration breakdown:
 * - `withCredentials: true` - CRITICAL: Tells browser to send cookies with requests.
 *   Without this, httpOnly cookies containing auth tokens would not be sent.
 * - `baseURL` - Points to API server (same origin in dev, cross-origin in production)
 *
 * @why_no_auth_header Unlike localStorage-based auth, we don't set Authorization headers.
 * The access_token cookie is sent automatically by the browser. This is more secure
 * because the token never touches JavaScript.
 */
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: Required for httpOnly cookies to be sent
})

/**
 * REQUEST INTERCEPTOR - CSRF Token Injection
 *
 * Automatically adds CSRF token to state-changing requests (POST, PATCH, PUT, DELETE).
 * This implements the "double-submit cookie" pattern for CSRF protection.
 *
 * @security_flow
 * 1. Backend sets XSRF-TOKEN cookie (NOT httpOnly, so JS can read it)
 * 2. Backend sets access_token cookie (httpOnly, JS cannot read)
 * 3. Frontend reads XSRF-TOKEN and puts value in X-CSRF-Token header
 * 4. Browser automatically sends both cookies
 * 5. Backend verifies X-CSRF-Token header matches XSRF-TOKEN cookie
 *
 * @why_this_works
 * - Attackers can trigger cross-origin requests that send cookies
 * - But attackers CANNOT read cross-origin cookies (Same-Origin Policy)
 * - So attackers cannot set the X-CSRF-Token header correctly
 * - Request fails CSRF validation, attack is blocked
 *
 * @excluded_methods GET, HEAD, OPTIONS - These are "safe" methods that shouldn't
 * modify server state, so CSRF protection is not needed.
 */
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for non-GET requests (state-changing operations)
    const method = config.method?.toUpperCase()
    if (method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const token = getCSRFToken()
      if (token) {
        config.headers['X-CSRF-Token'] = token
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * RESPONSE INTERCEPTOR - Token Refresh & CSRF Recovery
 *
 * Handles two key security scenarios:
 * 1. Expired access tokens (401) - Attempts automatic refresh
 * 2. Invalid CSRF tokens (403) - Fetches new token and retries
 *
 * @security_pattern Token Refresh with Subscriber Queue
 *
 * Problem: When access token expires, multiple concurrent requests may all
 * receive 401 errors simultaneously. Without coordination:
 * - Each would trigger its own refresh request
 * - Race conditions could corrupt token state
 * - User might be logged out unnecessarily
 *
 * Solution: Subscriber pattern ensures only ONE refresh happens:
 * 1. First 401 triggers refresh, sets isRefreshing=true
 * 2. Subsequent 401s queue their retry callbacks
 * 3. When refresh completes, all queued requests retry
 *
 * @flow_diagram
 * Request A fails (401) → isRefreshing=false → Start refresh → isRefreshing=true
 * Request B fails (401) → isRefreshing=true → Subscribe to refresh
 * Request C fails (401) → isRefreshing=true → Subscribe to refresh
 * Refresh completes → Notify all subscribers → A, B, C retry with new token
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    const requestUrl = originalRequest?.url || ''

    /**
     * Auth endpoints that should NOT trigger token refresh on 401.
     *
     * These endpoints are expected to return 401 for unauthenticated users:
     * - /api/auth/me: Initial auth check on page load
     * - /api/auth/refresh: The refresh endpoint itself (avoid infinite loop)
     * - /api/auth/login: User hasn't logged in yet
     * - /api/auth/register: User is creating account
     *
     * Triggering refresh on these would cause infinite loops or unnecessary requests.
     */
    const skipRefreshPaths = [
      '/api/auth/me',       // Initial auth check - expected to fail if not logged in
      '/api/auth/refresh',  // Refresh endpoint itself - would cause infinite loop
      '/api/auth/login',    // Login - not authenticated yet
      '/api/auth/register', // Register - not authenticated yet
    ]
    const shouldSkipRefresh = skipRefreshPaths.some(path => requestUrl.includes(path))

    /**
     * 401 HANDLER - Access Token Expired
     *
     * When a request fails with 401 (Unauthorized), the access token has expired.
     * Attempt to get a new access token using the refresh token cookie.
     *
     * @flag _retry prevents infinite retry loops if refresh succeeds but
     * the retried request still fails (indicates a real auth problem).
     */
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true

      // SUBSCRIBER PATTERN: If refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((success: boolean) => {
            if (success) {
              // Refresh succeeded - retry the original request with new token
              resolve(api(originalRequest))
            } else {
              // Refresh failed - user will be redirected to login
              reject(error)
            }
          })
        })
      }

      // First request to detect expired token - initiate refresh
      isRefreshing = true

      try {
        // POST /api/auth/refresh uses refresh_token cookie (httpOnly)
        // Backend validates refresh token, issues new access_token cookie
        await api.post('/api/auth/refresh')
        isRefreshing = false
        onRefreshComplete(true)
        // Retry the original request - new access_token cookie will be sent
        return api(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        onRefreshComplete(false)

        // Refresh failed - refresh token is expired or invalid
        // Redirect to login page (unless already there)
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      }
    }

    /**
     * 403 HANDLER - CSRF Token Invalid
     *
     * CSRF tokens can become invalid if:
     * - Token expired (1 hour expiry)
     * - Token was rotated by another request
     * - Cookie was cleared by browser
     *
     * Recovery: Fetch a fresh CSRF token and retry the request once.
     *
     * @flag _csrfRetry prevents infinite loops if CSRF keeps failing.
     */
    if (error.response?.status === 403) {
      const errorCode = (error.response.data as any)?.error?.code
      if (errorCode === 'CSRF_TOKEN_INVALID' && !originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true

        try {
          // GET /api/csrf-token returns new token in response and sets cookie
          const response = await api.get('/api/csrf-token')
          if (response.data?.data?.csrfToken) {
            setCSRFToken(response.data.data.csrfToken)
          }
          // Retry original request with fresh CSRF token
          return api(originalRequest)
        } catch {
          return Promise.reject(error)
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api

// ==================== TYPE DEFINITIONS ====================

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  avatarUrl: string | null
  phoneNumber: string | null
  authProvider: 'email' | 'google'
  emailVerified: boolean
  createdAt: string
}

export interface Player {
  id: string
  mlbId: string
  name: string
  teamAbbr: string
  seasonYear: number
  hrsTotal: number
  isEligible: boolean
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface PlayerProfile extends Player {
  seasonHistory: Array<{
    id: string
    seasonYear: number
    hrsTotal: number
    teamAbbr: string
  }>
  draftCount: number
  latestSeasonStats: {
    seasonYear: number
    hrsTotal: number
    isEligible: boolean
  } | null
  capPercentage: number
}

export interface PlayerListResponse {
  players: Player[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface PlayerStatsResponse {
  totalPlayers: number
  averageHRs: number
  maxHRs: number
  minHRs: number
  teamDistribution: Array<{
    team: string
    count: number
  }>
}

export interface Team {
  id: string
  userId: string
  name: string
  seasonYear: number
  paymentStatus: 'draft' | 'pending' | 'paid' | 'rejected' | 'refunded'
  paymentNotes: string | null
  entryStatus: 'draft' | 'entered' | 'locked'
  totalHrs2024: number
  createdAt: string
  updatedAt: string
  lockedAt: string | null
  deletedAt: string | null
  teamPlayers?: Array<{
    id: string
    position: number
    player: Player
  }>
  user?: {
    id: string
    username: string
    avatarUrl: string | null
    email: string
  }
}

/**
 * Response returned after successful login.
 *
 * @security Note: The actual auth tokens (access_token, refresh_token) are NOT
 * in this response - they're set as httpOnly cookies by the backend. The only
 * token exposed to JavaScript is the CSRF token, which is intentionally readable
 * for the double-submit cookie pattern.
 */
export interface AuthResponse {
  user: User
  /** CSRF token for double-submit pattern. Safe to expose - it's also in a readable cookie. */
  csrfToken?: string
}

// ==================== LEADERBOARD TYPES ====================

export interface PlayerScore {
  playerId: string
  playerName: string
  hrsTotal: number
  hrsRegularSeason: number
  hrsPostseason: number
  included: boolean
}

export interface LeaderboardEntry {
  rank: number
  teamId: string
  teamName: string
  totalHrs: number
  regularSeasonHrs?: number
  postseasonHrs?: number
  userId: string
  username: string
  avatarUrl: string | null
  playerScores?: PlayerScore[]
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  seasonYear: number
  leaderboardType: 'overall' | 'monthly'
  totalTeams: number
  month?: number
}

export interface LeagueStats {
  averageScore: number
  highestScore: number
  lowestScore: number
  totalTeams: number
  topTeam?: LeaderboardEntry
}

// ==================== ADMIN TYPES ====================

export interface AdminStats {
  totalTeams: number
  pendingApprovals: number
  revenue: number
  activeUsers: number
  totalUsers: number
  teamsByPaymentStatus: {
    draft: number
    pending: number
    paid: number
    rejected: number
    refunded: number
  }
  teamsByEntryStatus: {
    draft: number
    entered: number
    locked: number
  }
  seasonYear: number
}

export interface AdminTeam extends Team {
  user?: {
    id: string
    username: string
    email: string
    avatarUrl: string | null
  }
}

export interface AdminUser {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  emailVerified: boolean
  authProvider: 'email' | 'google'
  avatarUrl: string | null
  phoneNumber: string | null
  createdAt: string
  teamCount: number
  paidTeamCount: number
  lastLoginAt?: string | null
  googleId?: string | null
}

export interface RecipientCounts {
  all: number
  unpaid: number
  paid: number
}

export interface NotificationResult {
  sentCount: number
  failedCount: number
  totalRecipients: number
}

export interface ReminderStatusItem {
  sentAt: string
  recipientCount: number
  sentBy: string
}

export interface ReminderStatus {
  payment: ReminderStatusItem | null
  lock_deadline: ReminderStatusItem | null
}

// ==================== SEASON TYPES ====================

export type SeasonPhase = 'off_season' | 'registration' | 'active' | 'completed'

export interface SeasonConfig {
  id: string
  seasonYear: number
  phase: SeasonPhase
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  seasonStartDate: string | null
  seasonEndDate: string | null
  isCurrentSeason: boolean
  lastPhaseChange: string
  changedBy: string | null
  createdAt: string
  updatedAt: string
}

// ==================== AUTH API ====================

/**
 * Authentication API endpoints.
 *
 * @security_model These endpoints use httpOnly cookie-based authentication:
 * - Login/OAuth: Backend sets httpOnly cookies (access_token, refresh_token)
 * - Subsequent requests: Browser automatically sends cookies
 * - Logout: Backend clears the httpOnly cookies
 *
 * This is more secure than localStorage because:
 * - XSS attacks cannot steal httpOnly cookies
 * - Tokens never touch JavaScript except for CSRF token
 */
export const authApi = {
  /**
   * Register a new user account.
   *
   * @security Does NOT log in the user automatically. User must verify email first.
   * This prevents attackers from creating accounts with victim's email.
   */
  register: async (data: {
    email: string
    username: string
    password: string
    phoneNumber: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  /**
   * Authenticate user with email and password.
   *
   * @security On success, backend sets three cookies:
   * - access_token: httpOnly, 15 min expiry, used for API authorization
   * - refresh_token: httpOnly, 7 day expiry, used to get new access tokens
   * - XSRF-TOKEN: NOT httpOnly, 1 hour expiry, readable for CSRF protection
   *
   * @returns User object and CSRF token (auth tokens are in cookies, not response body)
   */
  login: async (data: {
    email: string
    password: string
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  /**
   * Verify user's email address using token from email link.
   */
  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
  },

  /**
   * Request password reset email.
   */
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  /**
   * Reset password using token from email link.
   */
  resetPassword: async (data: {
    token: string
    password: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/reset-password', data)
    return response.data
  },

  /**
   * Get the currently authenticated user's profile.
   *
   * @security Used on app load to check if user has valid session.
   * The access_token cookie is sent automatically by the browser.
   * Returns 401 if not authenticated (cookie missing or expired).
   */
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  /**
   * Log out the current user.
   *
   * @security Backend clears all auth cookies (access_token, refresh_token, XSRF-TOKEN).
   * The httpOnly cookies can only be cleared by the server, not by JavaScript.
   */
  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  /**
   * Resend email verification link.
   */
  resendVerification: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/resend-verification')
    return response.data
  },

  /**
   * Refresh the access token using the httpOnly refresh token cookie.
   *
   * @security Called automatically by the response interceptor when access token expires.
   * Also called proactively by AuthContext every 10 minutes to prevent expiry.
   *
   * The refresh_token cookie is sent automatically by the browser.
   * On success, backend sets new access_token cookie (and optionally rotates refresh token).
   *
   * @returns Success/failure - new tokens are set as cookies, not in response body
   */
  refreshToken: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/refresh')
    return response.data
  },

  /**
   * Get a fresh CSRF token.
   *
   * @security Called when a request fails with CSRF_TOKEN_INVALID error.
   * Returns the token in response body AND sets XSRF-TOKEN cookie.
   * The token is safe to expose because it's not a secret - it just proves
   * the request originated from our frontend (not a CSRF attack).
   */
  getCSRFToken: async (): Promise<ApiResponse<{ csrfToken: string }>> => {
    const response = await api.get('/api/csrf-token')
    return response.data
  },

  /**
   * Initiate Google OAuth login flow.
   *
   * @security Redirects to backend OAuth endpoint, which redirects to Google.
   * After Google auth, user is redirected back with auth cookies set.
   * This uses the same httpOnly cookie security as email/password login.
   */
  googleLogin: () => {
    window.location.href = `${API_URL}/api/auth/google`
  },
}

// ==================== USERS API ====================

export const usersApi = {
  updateProfile: async (data: {
    username?: string
    avatarUrl?: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.patch('/api/users/me', data)
    return response.data
  },

  deleteAccount: async (): Promise<ApiResponse> => {
    const response = await api.delete('/api/users/me')
    return response.data
  },
}

// ==================== TEAMS API ====================

export const teamsApi = {
  /**
   * Create a new team
   */
  createTeam: async (data: {
    name: string
    seasonYear: number
    playerIds: string[]
  }): Promise<ApiResponse<Team>> => {
    const response = await api.post('/api/teams', data)
    return response.data
  },

  /**
   * Get a team by ID
   */
  getTeamById: async (id: string): Promise<ApiResponse<Team>> => {
    const response = await api.get(`/api/teams/${id}`)
    return response.data
  },

  /**
   * Alias for getTeamById
   */
  getTeam: async (id: string): Promise<ApiResponse<Team>> => {
    const response = await api.get(`/api/teams/${id}`)
    return response.data
  },

  /**
   * Get current user's teams
   */
  getMyTeams: async (seasonYear?: number): Promise<ApiResponse<Team[]>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/teams/my-teams${queryParams}`)
    return response.data
  },

  /**
   * Update a team (only before lock date)
   */
  updateTeam: async (
    id: string,
    data: {
      name?: string
      playerIds?: string[]
    }
  ): Promise<ApiResponse<Team>> => {
    const response = await api.patch(`/api/teams/${id}`, data)
    return response.data
  },

  /**
   * Delete a team (only before lock date)
   */
  deleteTeam: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/teams/${id}`)
    return response.data
  },
}

// ==================== PLAYERS API ====================

export const playersApi = {
  /**
   * Get all eligible players with optional filters
   */
  getPlayers: async (params?: {
    seasonYear?: number
    minHrs?: number
    maxHrs?: number
    team?: string
    search?: string
    sortBy?: 'name' | 'hrs' | 'team'
    sortOrder?: 'asc' | 'desc'
    limit?: number
    offset?: number
  }): Promise<ApiResponse<PlayerListResponse>> => {
    const queryParams = new URLSearchParams()

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const response = await api.get(`/api/players?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get a single player by ID
   */
  getPlayerById: async (id: string): Promise<ApiResponse<PlayerProfile>> => {
    const response = await api.get(`/api/players/${id}`)
    return response.data
  },

  /**
   * Search players by name
   */
  searchPlayers: async (params: {
    q: string
    seasonYear?: number
    limit?: number
  }): Promise<ApiResponse<Player[]>> => {
    const queryParams = new URLSearchParams()
    queryParams.append('q', params.q)

    if (params.seasonYear) {
      queryParams.append('seasonYear', String(params.seasonYear))
    }
    if (params.limit) {
      queryParams.append('limit', String(params.limit))
    }

    const response = await api.get(`/api/players/search?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get player pool summary statistics
   */
  getStats: async (seasonYear?: number): Promise<ApiResponse<PlayerStatsResponse>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/players/stats/summary${queryParams}`)
    return response.data
  },
}

// ==================== LEADERBOARDS API ====================

export const leaderboardsApi = {
  /**
   * Get overall season leaderboard
   */
  getOverall: async (seasonYear?: number): Promise<ApiResponse<LeaderboardResponse>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/leaderboards/overall${queryParams}`)
    return response.data
  },

  /**
   * Get monthly leaderboard
   */
  getMonthly: async (month: number, seasonYear?: number): Promise<ApiResponse<LeaderboardResponse>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/leaderboards/monthly/${month}${queryParams}`)
    return response.data
  },

  /**
   * Get specific team's rank and score
   */
  getTeamRank: async (teamId: string, seasonYear?: number): Promise<ApiResponse<{
    teamId: string
    teamName: string
    totalHrs: number
    regularSeasonHrs: number
    postseasonHrs: number
    playerScores?: PlayerScore[]
    calculatedAt: string
    rank: number | null
    totalTeams: number
  }>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/leaderboards/team/${teamId}${queryParams}`)
    return response.data
  },

  /**
   * Get league-wide statistics
   */
  getStats: async (seasonYear?: number): Promise<ApiResponse<LeagueStats>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/leaderboards/stats${queryParams}`)
    return response.data
  },
}

// ==================== ADMIN API ====================

export const adminApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async (seasonYear?: number): Promise<ApiResponse<AdminStats>> => {
    const queryParams = seasonYear ? `?seasonYear=${seasonYear}` : ''
    const response = await api.get(`/api/admin/stats${queryParams}`)
    return response.data
  },

  /**
   * Get all teams with filters
   */
  getTeams: async (params?: {
    paymentStatus?: string
    entryStatus?: string
    seasonYear?: number
    search?: string
  }): Promise<ApiResponse<AdminTeam[]>> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    const response = await api.get(`/api/admin/teams?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Get team details
   */
  getTeamDetails: async (id: string): Promise<ApiResponse<AdminTeam>> => {
    const response = await api.get(`/api/admin/teams/${id}`)
    return response.data
  },

  /**
   * Update team payment status
   */
  updateTeamStatus: async (
    id: string,
    paymentStatus: string,
    paymentNotes?: string
  ): Promise<ApiResponse<AdminTeam>> => {
    const response = await api.patch(`/api/admin/teams/${id}/status`, { paymentStatus, paymentNotes })
    return response.data
  },

  /**
   * Get all users with filters
   */
  getUsers: async (params?: {
    verified?: string
    role?: string
    search?: string
  }): Promise<ApiResponse<AdminUser[]>> => {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value))
        }
      })
    }
    const response = await api.get(`/api/admin/users?${queryParams.toString()}`)
    return response.data
  },

  /**
   * Manually verify user email
   */
  verifyUserEmail: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/api/admin/users/${id}/verify`)
    return response.data
  },

  /**
   * Send password reset to user
   */
  sendPasswordReset: async (id: string): Promise<ApiResponse> => {
    const response = await api.post(`/api/admin/users/${id}/reset-password`)
    return response.data
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/api/admin/users/${id}`)
    return response.data
  },

  /**
   * Get notification recipient counts
   */
  getRecipientCounts: async (): Promise<ApiResponse<RecipientCounts>> => {
    const response = await api.get('/api/admin/recipient-counts')
    return response.data
  },

  /**
   * Send bulk notifications
   */
  sendNotifications: async (data: {
    recipientGroup?: 'all' | 'unpaid' | 'paid'
    userEmail?: string
    subject: string
    body: string
  }): Promise<ApiResponse<NotificationResult>> => {
    const response = await api.post('/api/admin/notifications', data)
    return response.data
  },

  /**
   * End season
   */
  endSeason: async (seasonYear: number): Promise<ApiResponse> => {
    const response = await api.post('/api/admin/season/end', {
      confirmation: 'END SEASON',
      seasonYear,
    })
    return response.data
  },

  /**
   * Verify admin password for re-auth
   */
  verifyPassword: async (password: string): Promise<ApiResponse> => {
    const response = await api.post('/api/admin/verify-password', { password })
    return response.data
  },

  /**
   * Get reminder status (last sent time for each type)
   */
  getReminderStatus: async (): Promise<ApiResponse<ReminderStatus>> => {
    const response = await api.get('/api/admin/reminders/status')
    return response.data
  },

  /**
   * Send payment reminder
   */
  sendPaymentReminder: async (statuses: ('draft' | 'pending')[]): Promise<ApiResponse<NotificationResult>> => {
    const response = await api.post('/api/admin/reminders/payment', { statuses })
    return response.data
  },

  /**
   * Send lock deadline reminder
   */
  sendLockReminder: async (lockDate: string): Promise<ApiResponse<NotificationResult>> => {
    const response = await api.post('/api/admin/reminders/lock-deadline', { lockDate })
    return response.data
  },

  // ========== SEASON MANAGEMENT (Admin) ==========

  /**
   * Get all seasons
   */
  getSeasons: async (): Promise<ApiResponse<SeasonConfig[]>> => {
    const response = await api.get('/api/admin/seasons')
    return response.data
  },

  /**
   * Create a new season
   */
  createSeason: async (data: {
    seasonYear: number
    phase?: SeasonPhase
    registrationOpenDate?: string
    registrationCloseDate?: string
    seasonStartDate?: string
    seasonEndDate?: string
    isCurrentSeason?: boolean
  }): Promise<ApiResponse<SeasonConfig>> => {
    const response = await api.post('/api/admin/seasons', data)
    return response.data
  },

  /**
   * Update season phase
   */
  updateSeasonPhase: async (
    seasonYear: number,
    phase: SeasonPhase
  ): Promise<ApiResponse<SeasonConfig>> => {
    const response = await api.patch(`/api/admin/seasons/${seasonYear}/phase`, { phase })
    return response.data
  },

  /**
   * Update season dates/config
   */
  updateSeason: async (
    seasonYear: number,
    data: {
      registrationOpenDate?: string | null
      registrationCloseDate?: string | null
      seasonStartDate?: string | null
      seasonEndDate?: string | null
    }
  ): Promise<ApiResponse<SeasonConfig>> => {
    const response = await api.patch(`/api/admin/seasons/${seasonYear}`, data)
    return response.data
  },

  /**
   * Set season as current
   */
  setCurrentSeason: async (seasonYear: number): Promise<ApiResponse<SeasonConfig>> => {
    const response = await api.patch(`/api/admin/seasons/${seasonYear}/set-current`)
    return response.data
  },
}

// ==================== SEASON API (Public) ====================

export const seasonApi = {
  /**
   * Get current season configuration (public endpoint)
   */
  getCurrent: async (): Promise<ApiResponse<SeasonConfig | null>> => {
    const response = await api.get('/api/season/current')
    return response.data
  },
}
