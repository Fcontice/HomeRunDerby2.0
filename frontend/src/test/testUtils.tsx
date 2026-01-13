import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface WrapperProps {
  children: React.ReactNode
}

// Basic wrapper without auth - for testing auth components themselves
export function BasicWrapper({ children }: WrapperProps) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

// Custom render that wraps with providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: BasicWrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

// Test data helpers
export const TEST_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user' as const,
  emailVerified: true,
  authProvider: 'email' as const,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
}

export const TEST_ADMIN = {
  id: 'test-admin-456',
  email: 'admin@example.com',
  username: 'adminuser',
  role: 'admin' as const,
  emailVerified: true,
  authProvider: 'email' as const,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
}

export const TEST_SEASON = {
  id: 'season-2026',
  seasonYear: 2026,
  phase: 'registration' as const,
  registrationOpenDate: '2026-03-01',
  registrationCloseDate: '2026-03-25',
  seasonStartDate: '2026-03-28',
  seasonEndDate: '2026-10-30',
  isCurrentSeason: true,
  lastPhaseChange: new Date().toISOString(),
  changedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const TEST_TEAM = {
  id: 'team-123',
  name: 'Test Team',
  userId: TEST_USER.id,
  seasonYear: 2026,
  paymentStatus: 'paid' as const,
  entryStatus: 'entered' as const,
  totalHrs2024: 150,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const TEST_PLAYER = {
  id: 'player-1',
  mlbId: '592450',
  name: 'Aaron Judge',
  teamAbbr: 'NYY',
  photoUrl: null,
  seasonYear: 2025,
  hrsTotal: 62,
}

// Mock API response helpers
export function createSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
  }
}

export function createErrorResponse(message: string, code?: string) {
  return {
    success: false,
    error: {
      message,
      code: code || 'ERROR',
    },
  }
}
