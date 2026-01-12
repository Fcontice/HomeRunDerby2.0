import { useSeason } from '../contexts/SeasonContext'
import { SeasonPhase } from '../services/api'

interface PhaseCheckResult {
  isAllowed: boolean
  currentPhase: SeasonPhase | undefined
  season: ReturnType<typeof useSeason>['season']
  loading: boolean
}

/**
 * Hook to check if the current season phase allows certain actions
 * @param requiredPhases - Array of phases that are allowed
 * @returns Object with isAllowed boolean and current phase info
 */
export function usePhaseCheck(requiredPhases: SeasonPhase[]): PhaseCheckResult {
  const { season, loading } = useSeason()

  return {
    isAllowed: !loading && !!season && requiredPhases.includes(season.phase),
    currentPhase: season?.phase,
    season,
    loading,
  }
}

/**
 * Check if registration is currently open
 */
export function useRegistrationOpen() {
  return usePhaseCheck(['registration'])
}

/**
 * Check if the season is active (games in progress)
 */
export function useSeasonActive() {
  return usePhaseCheck(['active'])
}

/**
 * Check if we're in off-season mode
 */
export function useOffSeason() {
  return usePhaseCheck(['off_season'])
}
