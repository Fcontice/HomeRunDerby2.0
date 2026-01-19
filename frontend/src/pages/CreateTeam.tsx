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
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
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
        // Success! Navigate to payment page
        navigate(`/teams/${response.data.id}/payment`)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center py-8 px-4">
        <Card className="max-w-lg w-full p-8 text-center">
          {icon}
          <h1 className="text-2xl font-bold text-white mb-4">{title}</h1>
          <p className="text-slate-300 mb-6">{description}</p>
          {season?.registrationOpenDate && currentPhase === 'off_season' && (
            <p className="text-sm text-slate-400 mb-6">
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
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            {currentPhase === 'active' && (
              <Link to="/leaderboard">
                <Button>View Leaderboard</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading players...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Your Team</h1>
          <p className="text-slate-300 text-lg">
            Select 8 players with a combined max of {MAX_HRS} HRs from the {PLAYER_SEASON_YEAR}{' '}
            season
          </p>
        </div>

        {/* Email Verification Warning */}
        {!user?.emailVerified && (
          <Alert variant="destructive" className="mb-6">
            <Mail className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Email must be verified before creating a team</strong>
                <p className="text-sm mt-1">
                  Check your inbox for the verification email or click below to resend.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={resendingVerification || verificationSent}
                className="ml-4 flex-shrink-0"
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
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Team Name Input */}
        <Card className="p-6 mb-6">
          <div className="max-w-md">
            <Label htmlFor="team-name" className="text-base font-semibold mb-2 block text-foreground">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter your team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
              className={`text-base bg-slate-800/50 border-slate-700 ${
                isValidTeamName ? 'border-emerald-500/50' : ''
              }`}
            />
            <div className="flex items-center justify-between mt-2">
              {teamName.trim().length === 0 ? (
                <p className="text-sm text-amber-400">Team name is required</p>
              ) : teamName.trim().length < 3 ? (
                <p className="text-sm text-amber-400">Name must be at least 3 characters</p>
              ) : (
                <p className="text-sm text-emerald-400">✓ Valid team name</p>
              )}
              <p className="text-sm text-muted-foreground">
                {teamName.length}/50
              </p>
            </div>
          </div>
        </Card>

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
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={submitting}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Team...
              </>
            ) : (
              'Create Team'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
