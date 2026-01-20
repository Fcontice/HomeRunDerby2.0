import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { Navbar } from '../components/Navbar'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { teamsApi, playersApi, Team, Player } from '../services/api'
import PlayerBrowser from '../components/team/PlayerBrowser'
import TeamRoster from '../components/team/TeamRoster'
import {
  Users,
  Plus,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Lock,
  ChevronDown,
  ChevronUp,
  Trash2,
  DollarSign,
  X,
  Calendar,
  Copy,
  Check,
} from 'lucide-react'

const MAX_HRS = 172
const ENTRY_FEE = 100

const PAYMENT_OPTIONS = [
  { name: 'Venmo', handle: '@YourVenmoHandle', copyable: true },
  { name: 'Zelle', handle: 'your-email@example.com', copyable: true },
  { name: 'In-Person', handle: 'Contact admin to arrange cash pickup', copyable: false },
]

export default function MyTeams() {
  const { user } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  // Edit mode state
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [editedName, setEditedName] = useState('')
  const [saving, setSaving] = useState(false)

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentTeam, setPaymentTeam] = useState<Team | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Player HR map for view mode
  const [playerHrMap, setPlayerHrMap] = useState<Map<string, number>>(new Map())

  const isRegistrationOpen = season?.phase === 'registration'

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await teamsApi.getMyTeams()
      if (response.success && response.data) {
        setTeams(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch player HRs when a team is expanded
  useEffect(() => {
    const fetchPlayerHrs = async () => {
      if (!expandedTeamId) return
      const team = teams.find(t => t.id === expandedTeamId)
      if (!team) return

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
  }, [expandedTeamId, teams])

  // Fetch available players when entering edit mode
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!editingTeamId) return
      const team = teams.find(t => t.id === editingTeamId)
      if (!team) return

      try {
        const response = await playersApi.getPlayers({
          seasonYear: team.seasonYear - 1,
          minHrs: 10,
          limit: 500,
        })
        if (response.success && response.data) {
          setAvailablePlayers(response.data.players)
        }
      } catch (err) {
        console.error('Failed to fetch players:', err)
      }
    }

    fetchPlayers()
  }, [editingTeamId, teams])

  const handleToggleExpand = (teamId: string) => {
    if (editingTeamId) return // Don't toggle while editing
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
  }

  const startEditing = (team: Team) => {
    setEditingTeamId(team.id)
    setEditedName(team.name)
    setExpandedTeamId(team.id)
    if (team.teamPlayers) {
      const players = team.teamPlayers
        .sort((a, b) => a.position - b.position)
        .map(tp => tp.player)
      setSelectedPlayers(players)
    }
  }

  const cancelEditing = () => {
    setEditingTeamId(null)
    setSelectedPlayers([])
    setEditedName('')
  }

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
    if (!editingTeamId || selectedPlayers.length !== 8) return
    if (totalHRs > MAX_HRS) return

    try {
      setSaving(true)
      const response = await teamsApi.updateTeam(editingTeamId, {
        name: editedName,
        playerIds: selectedPlayers.map(p => p.id),
      })

      if (response.success) {
        await fetchTeams()
        setEditingTeamId(null)
        setSelectedPlayers([])
      }
    } catch (err) {
      console.error('Failed to update team:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!teamToDelete) return

    try {
      setDeleting(true)
      const response = await teamsApi.deleteTeam(teamToDelete.id)
      if (response.success) {
        setTeams(teams.filter(t => t.id !== teamToDelete.id))
        setDeleteDialogOpen(false)
        setTeamToDelete(null)
        if (expandedTeamId === teamToDelete.id) {
          setExpandedTeamId(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete team:', err)
    } finally {
      setDeleting(false)
    }
  }

  const openPaymentDialog = (team: Team) => {
    setPaymentTeam(team)
    setPaymentDialogOpen(true)
  }

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        }
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          className: 'bg-[#d97706]/20 text-[#d97706] border-[#d97706]/30',
        }
      case 'rejected':
        return {
          icon: <XCircle className="w-4 h-4" />,
          className: 'bg-red-500/20 text-red-400 border-red-500/30',
        }
      case 'refunded':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          className: 'bg-white/5 text-gray-500 border-white/10',
        }
      default:
        return {
          icon: <Edit className="w-4 h-4" />,
          className: 'bg-white/5 text-gray-500 border-white/10',
        }
    }
  }

  const getEntryBadge = (entryStatus: string) => {
    switch (entryStatus) {
      case 'locked':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-gray-400 text-xs uppercase tracking-wider">
            <Lock className="w-3 h-3" />
            Locked
          </div>
        )
      case 'entered':
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-[#b91c1c]/20 border border-[#b91c1c]/30 text-[#b91c1c] text-xs uppercase tracking-wider">
            <Trophy className="w-3 h-3" />
            Live
          </div>
        )
      default:
        return null
    }
  }

  const canEditTeam = (team: Team) => {
    return team.userId === user?.id &&
      team.paymentStatus !== 'paid' &&
      team.entryStatus !== 'locked' &&
      isRegistrationOpen
  }

  const canPayTeam = (team: Team) => {
    return team.userId === user?.id &&
      (team.paymentStatus === 'draft' || team.paymentStatus === 'rejected') &&
      team.entryStatus !== 'locked' &&
      isRegistrationOpen
  }

  // Stats
  const totalTeams = teams.length
  const paidTeams = teams.filter(t => t.paymentStatus === 'paid').length
  const draftTeams = teams.filter(t => t.paymentStatus === 'draft').length
  const totalHRsAll = teams.reduce((sum, team) => sum + (team.totalHomeRuns || 0), 0)

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-[#b91c1c]" />
              <h1 className="font-broadcast text-4xl text-white tracking-wide">MY TEAMS</h1>
            </div>
            <p className="text-gray-500 ml-4">
              Manage your fantasy baseball teams
            </p>
          </div>

          {isRegistrationOpen && (
            <Button
              onClick={() => navigate('/create-team')}
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        {teams.length > 0 && (
          <div className="mb-8 bg-[#18181b] border border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#b91c1c] flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                    <p className="font-broadcast text-2xl text-white">{totalTeams}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Paid</p>
                    <p className="font-broadcast text-2xl text-emerald-400">{paidTeams}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#d97706] flex items-center justify-center">
                    <Edit className="h-5 w-5 text-[#0c0c0c]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Draft</p>
                    <p className="font-broadcast text-2xl text-[#d97706]">{draftTeams}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Total HRs</p>
                    <p className="font-broadcast text-2xl text-white">{totalHRsAll}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#18181b] border border-white/10 p-6 animate-pulse">
                <div className="h-6 w-32 bg-white/5 mb-2" />
                <div className="h-4 w-24 bg-white/5" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-[#18181b] border border-white/10">
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="font-broadcast text-2xl text-white mb-2">NO TEAMS YET</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {isRegistrationOpen
                  ? "Create your first team and join the competition!"
                  : "Registration is currently closed."}
              </p>
              {isRegistrationOpen && (
                <Button
                  onClick={() => navigate('/create-team')}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Team
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const statusConfig = getStatusConfig(team.paymentStatus)
              const isExpanded = expandedTeamId === team.id
              const isEditing = editingTeamId === team.id

              return (
                <div
                  key={team.id}
                  className="bg-[#18181b] border border-white/10"
                >
                  {/* Team Header - Always visible */}
                  <div
                    className={`p-4 cursor-pointer hover:bg-white/5 transition-all ${isExpanded ? 'border-b border-white/10' : ''}`}
                    onClick={() => handleToggleExpand(team.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                          <span className="font-broadcast text-xl text-white">
                            {team.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium text-white text-lg truncate">{team.name}</h3>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-gray-500">{team.seasonYear} Season</span>
                            <div className={`flex items-center gap-1 px-2 py-0.5 border text-xs uppercase tracking-wider ${statusConfig.className}`}>
                              {statusConfig.icon}
                              {team.paymentStatus}
                            </div>
                            {getEntryBadge(team.entryStatus)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-broadcast text-2xl text-[#d97706]">{team.totalHomeRuns || 0}</p>
                          <p className="text-xs text-gray-500">HRs</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-[#0c0c0c] border border-white/5">
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">HR Cap Used</p>
                          <p className="font-broadcast text-xl text-[#d97706]">{team.totalHrs2024} / {MAX_HRS}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Players</p>
                          <p className="font-broadcast text-xl text-white">{team.teamPlayers?.length || 0} / 8</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Created</p>
                          <p className="text-sm text-white flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            {new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Scoring</p>
                          <p className="text-sm text-white">Best 7 of 8</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!isEditing && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {canPayTeam(team) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                openPaymentDialog(team)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Payment Instructions
                            </Button>
                          )}
                          {canEditTeam(team) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditing(team)
                              }}
                              variant="outline"
                              className="border-white/10 text-white hover:bg-white/5 rounded-none"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Team
                            </Button>
                          )}
                          {canEditTeam(team) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                setTeamToDelete(team)
                                setDeleteDialogOpen(true)
                              }}
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-none"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Warning Messages */}
                      {!isRegistrationOpen && team.paymentStatus !== 'paid' && (
                        <p className="text-sm text-[#d97706] mb-4">
                          Registration is closed. Team cannot be modified.
                        </p>
                      )}
                      {team.entryStatus === 'locked' && (
                        <p className="text-sm text-gray-500 mb-4">
                          This team is locked and cannot be modified.
                        </p>
                      )}

                      {/* Edit Mode */}
                      {isEditing ? (
                        <div>
                          {/* Edit Header */}
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-6 bg-[#d97706]" />
                              <h3 className="font-broadcast text-lg text-white">EDITING TEAM</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={handleSave}
                                disabled={saving || selectedPlayers.length !== 8 || totalHRs > MAX_HRS}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none"
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </Button>
                              <Button
                                onClick={cancelEditing}
                                variant="outline"
                                className="border-white/10 text-white hover:bg-white/5 rounded-none"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>

                          {/* Team Name Input */}
                          <div className="mb-6">
                            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Team Name</label>
                            <input
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="w-full max-w-md px-4 py-2 bg-[#0c0c0c] border border-white/10 text-white focus:outline-none focus:border-[#b91c1c]"
                              maxLength={50}
                            />
                          </div>

                          {/* Two Column Layout */}
                          <div className="grid gap-6 lg:grid-cols-2">
                            <PlayerBrowser
                              players={availablePlayers}
                              selectedPlayers={selectedPlayers}
                              onSelectPlayer={handleSelectPlayer}
                            />
                            <TeamRoster
                              selectedPlayers={selectedPlayers}
                              onRemovePlayer={handleRemovePlayer}
                              totalHRs={totalHRs}
                              maxHRs={MAX_HRS}
                            />
                          </div>
                        </div>
                      ) : (
                        /* View Mode - Roster */
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-[#d97706]" />
                            <h3 className="font-broadcast text-lg text-white">ROSTER</h3>
                            <span className="text-xs text-gray-500 ml-2">(Best 7 of 8 count toward score)</span>
                          </div>

                          {team.teamPlayers && team.teamPlayers.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {team.teamPlayers
                                .sort((a, b) => a.position - b.position)
                                .map((tp) => (
                                  <Link
                                    key={tp.id}
                                    to={`/players/${tp.player.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-3 p-3 bg-[#0c0c0c] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all"
                                  >
                                    <div className="w-8 h-8 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                                      <span className="font-broadcast text-sm text-white">{tp.position}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-white truncate">{tp.player.name}</p>
                                      <p className="text-xs text-gray-500">{tp.player.teamAbbr}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-broadcast text-lg text-[#d97706]">
                                        {playerHrMap.get(tp.player.id) ?? tp.player.hrsTotal ?? '—'}
                                      </p>
                                      <p className="text-xs text-gray-600">HRs</p>
                                    </div>
                                  </Link>
                                ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-8">
                              No players on this team
                            </p>
                          )}

                          {/* Total HR Cap */}
                          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                            <span className="text-gray-400">Total HR Cap</span>
                            <span className="font-broadcast text-2xl text-[#d97706]">
                              {team.totalHrs2024} / {MAX_HRS}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#18181b] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Team?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. Your team "{teamToDelete?.name}" will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-white/10 text-white hover:bg-white/5 rounded-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-none"
            >
              {deleting ? 'Deleting...' : 'Delete Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Instructions Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-[#18181b] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Payment Instructions
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {paymentTeam?.name} • {paymentTeam?.seasonYear} Season
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Pending Alert */}
            {paymentTeam?.paymentStatus === 'pending' && (
              <div className="p-4 bg-[#d97706]/10 border border-[#d97706]/30">
                <div className="flex items-center gap-2 text-[#d97706] mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Payment Pending Verification</span>
                </div>
                <p className="text-sm text-gray-400">
                  Your payment is being verified by an admin. This typically takes up to 24 hours.
                </p>
              </div>
            )}

            {/* Entry Fee */}
            <div className="p-4 bg-[#0c0c0c] border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Entry Fee</span>
                <span className="font-broadcast text-3xl text-[#d97706]">${ENTRY_FEE}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div>
              <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Payment Options</h4>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map((option, index) => (
                  <div
                    key={option.name}
                    className="flex items-center justify-between p-3 bg-[#0c0c0c] border border-white/5"
                  >
                    <div>
                      <p className="font-medium text-white">{option.name}</p>
                      <p className="text-sm text-gray-500 font-mono">{option.handle}</p>
                    </div>
                    {option.copyable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(option.handle, index)}
                        className="text-gray-400 hover:text-white hover:bg-white/5"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div>
              <h4 className="text-sm text-gray-500 uppercase tracking-wider mb-3">Instructions</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Send <span className="text-white font-medium">${ENTRY_FEE}</span> using one of the payment methods above.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Include your <span className="text-white font-medium">team name, email, and phone number</span> in the payment memo.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    An admin will verify your payment within <span className="text-white font-medium">24 hours</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    You'll receive a confirmation email once your team is officially entered.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setPaymentDialogOpen(false)}
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none w-full"
            >
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
