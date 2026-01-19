import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { Navbar } from '../components/Navbar'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { teamsApi, playersApi, Team, Player } from '../services/api'
import {
  ArrowLeft,
  Edit,
  Trash2,
  CreditCard,
  Trophy,
  Lock,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react'

// Player browser and roster components for edit mode
import PlayerBrowser from '../components/team/PlayerBrowser'
import TeamRoster from '../components/team/TeamRoster'

const MAX_HRS = 172

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [editedName, setEditedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Map of player IDs to their HR data for view mode
  const [playerHrMap, setPlayerHrMap] = useState<Map<string, number>>(new Map())

  const isOwner = team?.userId === user?.id
  const isRegistrationOpen = season?.phase === 'registration'

  // Team can be edited if: owner, not paid, not locked, and registration is open
  const canEdit = isOwner &&
    team?.paymentStatus !== 'paid' &&
    team?.entryStatus !== 'locked' &&
    isRegistrationOpen

  // Team can be deleted if same conditions as edit
  const canDelete = canEdit

  // Team can proceed to payment if: owner, draft status, not locked, registration open
  const canPay = isOwner &&
    (team?.paymentStatus === 'draft' || team?.paymentStatus === 'rejected') &&
    team?.entryStatus !== 'locked' &&
    isRegistrationOpen

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return

      try {
        setLoading(true)
        const response = await teamsApi.getTeamById(teamId)
        if (response.success && response.data) {
          setTeam(response.data)
          setEditedName(response.data.name)
          // Extract players from teamPlayers for edit mode
          if (response.data.teamPlayers) {
            const players = response.data.teamPlayers
              .sort((a, b) => a.position - b.position)
              .map(tp => tp.player)
            setSelectedPlayers(players)
          }
        } else {
          setError(response.error?.message || 'Failed to load team')
        }
      } catch (err) {
        setError('Failed to load team')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTeam()
  }, [teamId])

  // Fetch player HR data for view mode
  useEffect(() => {
    const fetchPlayerHrs = async () => {
      if (!team || !team.teamPlayers) return

      try {
        const response = await playersApi.getPlayers({
          seasonYear: team.seasonYear - 1,
          minHrs: 10,
          limit: 500,
        })
        if (response.success && response.data) {
          const hrMap = new Map<string, number>()
          response.data.players.forEach(p => {
            hrMap.set(p.id, p.hrsTotal)
          })
          setPlayerHrMap(hrMap)
        }
      } catch (err) {
        console.error('Failed to fetch player HRs:', err)
      }
    }

    fetchPlayerHrs()
  }, [team])

  // Fetch available players when entering edit mode
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!isEditing || !team) return

      try {
        const response = await playersApi.getPlayers({
          seasonYear: team.seasonYear - 1,
          minHrs: 10,
          limit: 500,
        })
        if (response.success && response.data) {
          const allPlayers = response.data.players
          setAvailablePlayers(allPlayers)

          // Sync selected players with available players data
          if (team.teamPlayers) {
            const currentPlayerIds = team.teamPlayers.map(tp => tp.player.id)
            const syncedPlayers = currentPlayerIds
              .map(id => allPlayers.find(p => p.id === id))
              .filter((p): p is Player => p !== undefined)

            if (syncedPlayers.length === currentPlayerIds.length) {
              setSelectedPlayers(syncedPlayers)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch players:', err)
      }
    }

    fetchPlayers()
  }, [isEditing, team])

  const handleSelectPlayer = (player: Player) => {
    if (selectedPlayers.length >= 8) return
    if (selectedPlayers.some(p => p.id === player.id)) return
    setSelectedPlayers([...selectedPlayers, player])
  }

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId))
  }

  const totalHRs = selectedPlayers.reduce((sum, p) => sum + (p.hrsTotal || 0), 0)

  const handleSave = async () => {
    if (!team || selectedPlayers.length !== 8) return
    if (totalHRs > MAX_HRS) return

    try {
      setSaving(true)
      const response = await teamsApi.updateTeam(team.id, {
        name: editedName,
        playerIds: selectedPlayers.map(p => p.id),
      })

      if (response.success && response.data) {
        setTeam(response.data)
        setIsEditing(false)
      } else {
        setError(response.error?.message || 'Failed to update team')
      }
    } catch (err) {
      setError('Failed to update team')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!team) return

    try {
      setDeleting(true)
      const response = await teamsApi.deleteTeam(team.id)
      if (response.success) {
        navigate('/dashboard')
      } else {
        setError(response.error?.message || 'Failed to delete team')
      }
    } catch (err) {
      setError('Failed to delete team')
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    if (team?.teamPlayers) {
      const players = team.teamPlayers
        .sort((a, b) => a.position - b.position)
        .map(tp => tp.player)
      setSelectedPlayers(players)
    }
    setEditedName(team?.name || '')
  }

  // Status badge helper
  const getStatusBadge = () => {
    if (!team) return null

    const badges = []

    switch (team.paymentStatus) {
      case 'paid':
        badges.push(
          <Badge key="payment" variant="default" className="bg-emerald-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        )
        break
      case 'pending':
        badges.push(
          <Badge key="payment" variant="secondary" className="bg-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            Payment Pending
          </Badge>
        )
        break
      case 'rejected':
        badges.push(
          <Badge key="payment" variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Payment Failed
          </Badge>
        )
        break
      case 'refunded':
        badges.push(
          <Badge key="payment" variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Refunded
          </Badge>
        )
        break
      default:
        badges.push(
          <Badge key="payment" variant="outline">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        )
    }

    if (team.entryStatus === 'locked') {
      badges.push(
        <Badge key="entry" variant="secondary" className="bg-slate-600">
          <Lock className="w-3 h-3 mr-1" />
          Locked
        </Badge>
      )
    } else if (team.entryStatus === 'entered') {
      badges.push(
        <Badge key="entry" variant="default" className="bg-blue-600">
          <Trophy className="w-3 h-3 mr-1" />
          Live
        </Badge>
      )
    }

    return badges
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-slate-700 rounded" />
            <div className="h-32 bg-slate-800 rounded-lg" />
            <div className="h-96 bg-slate-800 rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error || 'Team not found'}</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/my-teams')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Teams
        </Button>

        {/* Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {/* Top row: Name and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold bg-slate-800 border border-slate-700 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary w-full"
                    maxLength={50}
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                )}
                <p className="text-muted-foreground mt-1">
                  {team.seasonYear} Season
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge()}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">HR Cap Used</p>
                <p className="text-xl font-bold text-primary">{team.totalHrs2024} / {MAX_HRS}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Players</p>
                <p className="text-xl font-bold">{team.teamPlayers?.length || 0} / 8</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Created</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Scoring</p>
                <p className="text-sm font-medium">Best 7 of 8</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {canPay && (
                <Button onClick={() => navigate(`/teams/${team.id}/payment`)}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Complete Payment
                </Button>
              )}

              {canEdit && !isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Team
                </Button>
              )}

              {canDelete && !isEditing && (
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Team?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. Your team "{team.name}" will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {isEditing && (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={saving || selectedPlayers.length !== 8 || totalHRs > MAX_HRS}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                </>
              )}
            </div>

            {/* Warning messages */}
            {!isRegistrationOpen && isOwner && team.paymentStatus !== 'paid' && (
              <p className="text-sm text-amber-400 mt-4">
                Registration is closed. Team cannot be modified.
              </p>
            )}
            {team.entryStatus === 'locked' && (
              <p className="text-sm text-muted-foreground mt-4">
                This team is locked and cannot be modified.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="border-destructive mb-6">
            <CardContent className="pt-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Mode - Two columns */}
        {isEditing ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Available Players</CardTitle>
                <CardDescription>{team.seasonYear - 1} Season Stats</CardDescription>
              </CardHeader>
              <CardContent>
                <PlayerBrowser
                  players={availablePlayers}
                  selectedPlayers={selectedPlayers}
                  onSelectPlayer={handleSelectPlayer}
                />
              </CardContent>
            </Card>

            <TeamRoster
              selectedPlayers={selectedPlayers}
              onRemovePlayer={handleRemovePlayer}
              totalHRs={totalHRs}
              maxHRs={MAX_HRS}
            />
          </div>
        ) : (
          /* View Mode - Full width roster */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Roster
              </CardTitle>
              <CardDescription>
                8 players (best 7 of 8 count toward score)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.teamPlayers && team.teamPlayers.length > 0 ? (
                <div className="space-y-2">
                  {team.teamPlayers
                    .sort((a, b) => a.position - b.position)
                    .map((tp) => (
                      <Link
                        key={tp.id}
                        to={`/players/${tp.player.id}`}
                        className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all"
                      >
                        {/* Position */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                          {tp.position}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg">
                            {tp.player.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tp.player.teamAbbr}
                          </p>
                        </div>

                        {/* HRs */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            {playerHrMap.get(tp.player.id) ?? tp.player.hrsTotal ?? '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            HRs ({team.seasonYear - 1})
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No players on this team
                </p>
              )}

              {/* Total HRs */}
              <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                <span className="text-lg font-semibold">Total HR Cap</span>
                <span className="text-2xl font-bold text-primary">
                  {team.totalHrs2024} / {MAX_HRS}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
