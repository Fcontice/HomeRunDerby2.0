import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { seasonApi, SeasonConfig } from '../services/api'

interface SeasonContextType {
  season: SeasonConfig | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined)

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [season, setSeason] = useState<SeasonConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSeason = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await seasonApi.getCurrent()
      if (response.success) {
        setSeason(response.data || null)
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch season'))
      }
    } catch (err) {
      console.error('Failed to fetch current season:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch season'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch current season on mount
  useEffect(() => {
    fetchSeason()
  }, [fetchSeason])

  const value: SeasonContextType = {
    season,
    loading,
    error,
    refetch: fetchSeason,
  }

  return (
    <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
  )
}

export function useSeason() {
  const context = useContext(SeasonContext)
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider')
  }
  return context
}
