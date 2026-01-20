/**
 * CreateTeam Page
 * Main page for creating a new team with player selection
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { playersApi, teamsApi, Player, authApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { usePhaseCheck } from '../hooks/usePhaseCheck'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import PlayerBrowser from '../components/team/PlayerBrowser'
import TeamRoster from '../components/team/TeamRoster'
import { Loader2, AlertCircle, Mail, Clock, Calendar } from 'lucide-react'

const MAX_HRS = 172
const CONTEST_YEAR = 2026
const PLAYER_SEASON_YEAR = 2025

export default function CreateTeam() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { isAllowed: isRegistrationOpen, currentPhase, season, loading: seasonLoading } = usePhaseCheck(['registration'])

  // State
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [resendingVerification, setResendingVerification] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  // Refresh user data on mount to get latest emailVerified status
  useEffect(() => {
    refreshUser()
  }, [])

  // Fetch players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await playersApi.getPlayers({
          seasonYear: PLAYER_SEASON_YEAR,
          minHrs: 10,
          sortBy: 'hrs',
          sortOrder: 'desc',
        })

        if (response.success && response.data) {
          setPlayers(response.data.players)
        } else {
          setError(response.error?.message || 'Failed to load players')
        }
      } catch (err: unknown) {
        setError((err as Error).message || 'Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  // Calculate total HRs
  const totalHRs = selectedPlayers.reduce((sum, p) => sum + p.hrsTotal, 0)

  // Validation
  const isValidTeamName = teamName.trim().length >= 3
  const canSubmit =
    user?.emailVerified &&
    selectedPlayers.length === 8 &&
    totalHRs <= MAX_HRS &&
    isValidTeamName &&
    !submitting

  // Handle player selection
  const handleSelectPlayer = (player: Player) => {
    if (selectedPlayers.length >= 8) {
      return // Roster full
    }

    if (selectedPlayers.some((p) => p.id === player.id)) {
      return // Already selected
    }

    setSelectedPlayers([...selectedPlayers, player])
  }

  // Handle player removal
  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => p.id !== playerId))
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit) return

    try {
      setSubmitting(true)
      setError('')

      const playerIds = selectedPlayers.map((p) => p.id)

      const response = await teamsApi.createTeam({
        name: teamName.trim(),
        seasonYear: CONTEST_YEAR,
        playerIds,
      })

      if (response.success && response.data) {
        // Success! Navigate to my teams page
        navigate('/my-teams')
      } else {
        setError(response.error?.message || 'Failed to create team')
      }
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Failed to create team. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setResendingVerification(true)
      setError('')

      const response = await authApi.resendVerification()

      if (response.success) {
        setVerificationSent(true)
        setTimeout(() => setVerificationSent(false), 5000)
        // Refresh user data in case they verified while on this page
        await refreshUser()
      } else {
        // Check if error is "already verified" - if so, refresh user data
        if (response.message?.includes('already verified')) {
          await refreshUser()
          setError('Your email is already verified! The page will update shortly.')
          setTimeout(() => setError(''), 3000)
        } else {
          setError(response.message || 'Failed to resend verification email')
        }
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Failed to resend verification email. Please try again.'

      // If error indicates already verified, refresh user data
      if (errorMessage.includes('already verified')) {
        await refreshUser()
        setError('Your email is already verified! The page will update shortly.')
        setTimeout(() => setError(''), 3000)
      } else {
        setError(errorMessage)
      }
    } finally {
      setResendingVerification(false)
    }
  }

  // Season loading state
  if (seasonLoading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#b91c1c] mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  // Off-season / registration closed state
  if (!isRegistrationOpen) {
    const getPhaseMessage = () => {
      switch (currentPhase) {
        case 'off_season':
          return {
            title: 'Registration Opens Soon',
            description: `Season ${season?.seasonYear || CONTEST_YEAR} registration is not yet open. Check back later for updates!`,
            icon: <Clock className="h-16 w-16 text-blue-400 mx-auto mb-4" />,
          }
        case 'active':
          return {
            title: 'Season In Progress',
            description: `Season ${season?.seasonYear || CONTEST_YEAR} is currently active. Teams are locked and the leaderboard is live!`,
            icon: <Calendar className="h-16 w-16 text-green-400 mx-auto mb-4" />,
          }
        case 'completed':
          return {
            title: 'Season Completed',
            description: `Season ${season?.seasonYear || CONTEST_YEAR} has ended. Congratulations to all winners! Stay tuned for next season.`,
            icon: <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />,
          }
        default:
          return {
            title: 'Registration Closed',
            description: 'Team registration is currently closed. Please check back later.',
            icon: <Clock className="h-16 w-16 text-slate-400 mx-auto mb-4" />,
          }
      }
    }

    const { title, description, icon } = getPhaseMessage()

    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center py-8 px-4">
        <div className="max-w-lg w-full p-8 text-center bg-[#18181b] border border-white/10">
          {icon}
          <h1 className="font-broadcast text-3xl text-white mb-4">{title}</h1>
          <p className="text-gray-400 mb-6">{description}</p>
          {season?.registrationOpenDate && currentPhase === 'off_season' && (
            <p className="text-sm text-gray-500 mb-6">
              Registration opens:{' '}
              {new Date(season.registrationOpenDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button variant="outline" className="border-white/20 text-gray-300 hover:bg-white/5">
                Back to Dashboard
              </Button>
            </Link>
            {currentPhase === 'active' && (
              <Link to="/leaderboard">
                <Button className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none font-broadcast">
                  VIEW LEADERBOARD
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#b91c1c] mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Loading players...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Broadcast Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#b91c1c]" />
            <span className="text-[#b91c1c] font-broadcast text-sm tracking-wider">TEAM BUILDER</span>
          </div>
          <h1 className="font-broadcast text-4xl md:text-5xl text-white mb-3">BUILD YOUR ROSTER</h1>
          <p className="text-gray-400 text-lg">
            Draft 8 players • {PLAYER_SEASON_YEAR} stats • {MAX_HRS} HR salary cap
          </p>
        </div>

        {/* Salary Cap Scoreboard */}
        <div className="mb-8 p-6 bg-[#18181b] border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-8">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Salary Cap Used</div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-broadcast text-4xl ${totalHRs > MAX_HRS ? 'text-red-500' : 'text-white'}`}>
                    {totalHRs}
                  </span>
                  <span className="text-gray-500 font-broadcast text-2xl">/ {MAX_HRS}</span>
                </div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Roster</div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-broadcast text-4xl ${selectedPlayers.length === 8 ? 'text-[#d97706]' : 'text-white'}`}>
                    {selectedPlayers.length}
                  </span>
                  <span className="text-gray-500 font-broadcast text-2xl">/ 8</span>
                </div>
              </div>
              <div className="h-12 w-px bg-white/10" />
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cap Remaining</div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-broadcast text-4xl ${MAX_HRS - totalHRs < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {MAX_HRS - totalHRs}
                  </span>
                  <span className="text-gray-500 font-broadcast text-lg">HRs</span>
                </div>
              </div>
            </div>

            {/* Cap Progress Bar */}
            <div className="flex-1 max-w-md">
              <div className="h-3 bg-[#0c0c0c] rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-300 ${
                    totalHRs > MAX_HRS ? 'bg-red-500' : totalHRs > MAX_HRS * 0.9 ? 'bg-[#d97706]' : 'bg-[#b91c1c]'
                  }`}
                  style={{ width: `${Math.min((totalHRs / MAX_HRS) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>0</span>
                <span>{MAX_HRS}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Verification Warning */}
        {!user?.emailVerified && (
          <div className="mb-6 p-4 bg-[#b91c1c]/10 border border-[#b91c1c]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#b91c1c]" />
              <div>
                <strong className="text-white">Email verification required</strong>
                <p className="text-sm text-gray-400 mt-0.5">
                  Check your inbox for the verification email or resend it.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={resendingVerification || verificationSent}
              className="ml-4 flex-shrink-0 border-[#b91c1c]/50 text-[#b91c1c] hover:bg-[#b91c1c]/10"
            >
              {resendingVerification ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Sending...
                </>
              ) : verificationSent ? (
                'Email Sent!'
              ) : (
                'Resend Email'
              )}
            </Button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* Team Name Input */}
        <div className="mb-6 p-6 bg-[#18181b] border border-white/10">
          <div className="max-w-md">
            <Label htmlFor="team-name" className="font-broadcast text-lg mb-3 block text-white">
              TEAM NAME
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter your team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
              className={`text-base bg-[#0c0c0c] border-white/20 text-white placeholder:text-gray-500 focus:border-[#b91c1c] ${
                isValidTeamName ? 'border-emerald-500/50' : ''
              }`}
            />
            <div className="flex items-center justify-between mt-2">
              {teamName.trim().length === 0 ? (
                <p className="text-sm text-[#d97706]">Team name is required</p>
              ) : teamName.trim().length < 3 ? (
                <p className="text-sm text-[#d97706]">Name must be at least 3 characters</p>
              ) : (
                <p className="text-sm text-emerald-400">Valid team name</p>
              )}
              <p className="text-sm text-gray-500">
                {teamName.length}/50
              </p>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Player Browser */}
          <div>
            <PlayerBrowser
              players={players}
              selectedPlayers={selectedPlayers}
              onSelectPlayer={handleSelectPlayer}
            />
          </div>

          {/* Right: Team Roster */}
          <div>
            <TeamRoster
              selectedPlayers={selectedPlayers}
              onRemovePlayer={handleRemovePlayer}
              totalHRs={totalHRs}
              maxHRs={MAX_HRS}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            disabled={submitting}
            className="text-gray-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className={`font-broadcast text-lg px-8 py-6 rounded-none transition-all ${
              canSubmit
                ? 'bg-[#b91c1c] hover:bg-[#991b1b] text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                CREATING TEAM...
              </>
            ) : (
              'CREATE TEAM'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
