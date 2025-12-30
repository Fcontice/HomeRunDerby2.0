/**
 * CreateTeam Page
 * Main page for creating a new team with player selection
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { playersApi, teamsApi, Player, authApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import PlayerBrowser from '../components/team/PlayerBrowser'
import TeamRoster from '../components/team/TeamRoster'
import { Loader2, AlertCircle, Mail } from 'lucide-react'

const MAX_HRS = 172
const CONTEST_YEAR = 2026
const PLAYER_SEASON_YEAR = 2025

export default function CreateTeam() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

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
  const canSubmit =
    user?.emailVerified &&
    selectedPlayers.length === 8 &&
    totalHRs <= MAX_HRS &&
    teamName.trim().length > 0 &&
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
            <Label htmlFor="team-name" className="text-base font-semibold mb-2 block">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter your team name..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={50}
              className="text-base"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {teamName.length}/50 characters
            </p>
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
