import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/testUtils'
import userEvent from '@testing-library/user-event'
import Dashboard from './Dashboard'
import { TEST_USER, TEST_ADMIN, TEST_SEASON } from '../test/testUtils'
import { SeasonConfig, User } from '../services/api'

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
const mockLogout = vi.fn()
let mockUser: User = TEST_USER
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    loading: false,
  }),
}))

// Mock useSeason
let mockSeason: SeasonConfig = TEST_SEASON
vi.mock('../contexts/SeasonContext', () => ({
  useSeason: () => ({
    season: mockSeason,
    loading: false,
    error: null,
  }),
}))

// Mock LeaderboardWidget
vi.mock('../components/leaderboard', () => ({
  LeaderboardWidget: () => <div data-testid="leaderboard-widget">Leaderboard Widget</div>,
}))

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = TEST_USER
    mockSeason = TEST_SEASON as SeasonConfig
  })

  describe('Rendering', () => {
    it('renders the page title', () => {
      render(<Dashboard />)

      expect(screen.getByText('Home Run Derby')).toBeInTheDocument()
    })

    it('renders welcome message with username', () => {
      render(<Dashboard />)

      expect(screen.getByText(`Welcome, ${TEST_USER.username}!`)).toBeInTheDocument()
    })

    it('renders user profile information', () => {
      render(<Dashboard />)

      expect(screen.getByText(TEST_USER.email)).toBeInTheDocument()
      expect(screen.getByText(TEST_USER.role)).toBeInTheDocument()
      expect(screen.getByText(TEST_USER.authProvider)).toBeInTheDocument()
    })

    it('renders the leaderboard widget', () => {
      render(<Dashboard />)

      expect(screen.getByTestId('leaderboard-widget')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('renders navigation links', () => {
      render(<Dashboard />)

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /players/i })).toHaveAttribute('href', '/players')
      expect(screen.getByRole('link', { name: /leaderboard/i })).toHaveAttribute('href', '/leaderboard')
    })

    it('renders logout button', () => {
      render(<Dashboard />)

      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })
  })

  describe('Create Team Link', () => {
    it('shows Create Team link when registration is open', () => {
      mockSeason = { ...TEST_SEASON, phase: 'registration' }
      render(<Dashboard />)

      const createTeamLink = screen.getByRole('link', { name: /create team/i })
      expect(createTeamLink).toBeInTheDocument()
      expect(createTeamLink).toHaveAttribute('href', '/create-team')
    })

    it('shows closed badge when registration is not open', () => {
      mockSeason = { ...TEST_SEASON, phase: 'active' }
      render(<Dashboard />)

      expect(screen.queryByRole('link', { name: /create team/i })).not.toBeInTheDocument()
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })

    it('shows closed badge during off_season', () => {
      mockSeason = { ...TEST_SEASON, phase: 'off_season' }
      render(<Dashboard />)

      expect(screen.queryByRole('link', { name: /create team/i })).not.toBeInTheDocument()
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })
  })

  describe('Admin Link', () => {
    it('shows admin link for admin users', () => {
      mockUser = TEST_ADMIN
      render(<Dashboard />)

      const adminLink = screen.getByRole('link', { name: /admin/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute('href', '/admin')
    })

    it('does not show admin link for regular users', () => {
      mockUser = TEST_USER
      render(<Dashboard />)

      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument()
    })
  })

  describe('Logout', () => {
    it('calls logout and navigates to login on logout click', async () => {
      mockLogout.mockResolvedValueOnce(undefined)
      const user = userEvent.setup()
      render(<Dashboard />)

      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await user.click(logoutButton)

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      })
    })
  })

})
