import { vi } from 'vitest'
import { TEST_USER, TEST_SEASON, TEST_PLAYER, TEST_TEAM } from '../testUtils'

// Mock API responses
export const mockAuthApi = {
  login: vi.fn().mockResolvedValue({
    success: true,
    data: {
      user: TEST_USER,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  }),
  register: vi.fn().mockResolvedValue({
    success: true,
    message: 'Registration successful',
  }),
  logout: vi.fn().mockResolvedValue({
    success: true,
  }),
  getProfile: vi.fn().mockResolvedValue({
    success: true,
    data: { user: TEST_USER },
  }),
  verifyEmail: vi.fn().mockResolvedValue({
    success: true,
    message: 'Email verified',
  }),
  forgotPassword: vi.fn().mockResolvedValue({
    success: true,
    message: 'Reset email sent',
  }),
  resetPassword: vi.fn().mockResolvedValue({
    success: true,
    message: 'Password reset successful',
  }),
  resendVerification: vi.fn().mockResolvedValue({
    success: true,
  }),
}

export const mockSeasonApi = {
  getCurrent: vi.fn().mockResolvedValue({
    success: true,
    data: TEST_SEASON,
  }),
}

export const mockTeamsApi = {
  getMyTeams: vi.fn().mockResolvedValue({
    success: true,
    data: [TEST_TEAM],
  }),
  getTeam: vi.fn().mockResolvedValue({
    success: true,
    data: TEST_TEAM,
  }),
  createTeam: vi.fn().mockResolvedValue({
    success: true,
    data: TEST_TEAM,
  }),
  updateTeam: vi.fn().mockResolvedValue({
    success: true,
    data: TEST_TEAM,
  }),
  deleteTeam: vi.fn().mockResolvedValue({
    success: true,
  }),
}

export const mockPlayersApi = {
  getPlayers: vi.fn().mockResolvedValue({
    success: true,
    data: {
      players: [TEST_PLAYER],
      pagination: {
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    },
  }),
  getPlayer: vi.fn().mockResolvedValue({
    success: true,
    data: TEST_PLAYER,
  }),
  searchPlayers: vi.fn().mockResolvedValue({
    success: true,
    data: [TEST_PLAYER],
  }),
}

export const mockLeaderboardsApi = {
  getOverall: vi.fn().mockResolvedValue({
    success: true,
    data: {
      leaderboard: [],
      lastUpdated: new Date().toISOString(),
    },
  }),
  getMonthly: vi.fn().mockResolvedValue({
    success: true,
    data: [],
  }),
}

// Reset all mocks
export function resetAllApiMocks() {
  Object.values(mockAuthApi).forEach((fn) => fn.mockClear())
  Object.values(mockSeasonApi).forEach((fn) => fn.mockClear())
  Object.values(mockTeamsApi).forEach((fn) => fn.mockClear())
  Object.values(mockPlayersApi).forEach((fn) => fn.mockClear())
  Object.values(mockLeaderboardsApi).forEach((fn) => fn.mockClear())
}

// Create the mock module
export const apiMocks = {
  authApi: mockAuthApi,
  seasonApi: mockSeasonApi,
  teamsApi: mockTeamsApi,
  playersApi: mockPlayersApi,
  leaderboardsApi: mockLeaderboardsApi,
}
