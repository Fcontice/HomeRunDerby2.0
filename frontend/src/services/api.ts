import axios, { AxiosInstance, AxiosError } from 'axios'

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Clear tokens and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
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
  stripePaymentId: string | null
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
  }
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
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

export const authApi = {
  register: async (data: {
    email: string
    username: string
    password: string
  }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/api/auth/register', data)
    return response.data
  },

  login: async (data: {
    email: string
    password: string
  }): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/api/auth/login', data)
    return response.data
  },

  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
  },

  resetPassword: async (data: {
    token: string
    password: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/reset-password', data)
    return response.data
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/api/auth/me')
    return response.data
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/logout')
    return response.data
  },

  resendVerification: async (): Promise<ApiResponse> => {
    const response = await api.post('/api/auth/resend-verification')
    return response.data
  },

  // Google OAuth - opens in same window
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

// ==================== PAYMENTS API ====================

export const paymentsApi = {
  /**
   * Create a checkout session for team payment
   */
  createCheckout: async (
    teamId: string
  ): Promise<ApiResponse<{ checkoutUrl: string; sessionId: string }>> => {
    const response = await api.post('/api/payments/checkout', { teamId })
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
    paymentStatus: string
  ): Promise<ApiResponse<AdminTeam>> => {
    const response = await api.patch(`/api/admin/teams/${id}/status`, { paymentStatus })
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
