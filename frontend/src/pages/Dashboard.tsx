import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { LeaderboardWidget } from '../components/leaderboard'
import { Navbar } from '../components/Navbar'
import { teamsApi, Team } from '../services/api'
import {
  Users,
  Trophy,
  Plus,
  ChevronRight,
  Calendar,
  X,
  ExternalLink,
  FileEdit,
  AlertCircle,
  Maximize2,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [showDraftModal, setShowDraftModal] = useState(false)

  const isRegistrationOpen = season?.phase === 'registration'

  // Filter draft teams (unpaid)
  const draftTeams = teams.filter(t => t.paymentStatus === 'draft')
  const hasDraftTeams = draftTeams.length > 0

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await teamsApi.getMyTeams()
        if (response.success && response.data) {
          setTeams(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch teams:', error)
      } finally {
        setTeamsLoading(false)
      }
    }
    fetchTeams()
  }, [])

  // Calculate total HRs across all teams
  const totalHRs = teams.reduce((sum, team) => sum + (team.totalHrs2024 || 0), 0)

  // Find best performing team
  const bestTeam = teams.length > 0
    ? teams.reduce((best, team) => (team.totalHrs2024 || 0) > (best.totalHrs2024 || 0) ? team : best)
    : null

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#b91c1c]" />
            <h1 className="font-broadcast text-4xl text-white tracking-wide">
              WELCOME BACK, {user?.username?.toUpperCase()}
            </h1>
          </div>
          <p className="text-gray-500 ml-4">
            {isRegistrationOpen
              ? "Registration is open. Draft your team and compete!"
              : "Track your teams and watch the leaderboard."}
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="mb-8 bg-[#18181b] border border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {/* Teams Count - Always clickable */}
            <button
              onClick={() => {
                if (hasDraftTeams) {
                  setShowDraftModal(true)
                } else if (teams.length === 0 && isRegistrationOpen) {
                  navigate('/create-team')
                } else {
                  navigate('/my-teams')
                }
              }}
              className="p-4 md:p-6 text-left hover:bg-white/5 transition-colors group"
              aria-label={
                hasDraftTeams
                  ? `You have ${draftTeams.length} draft team${draftTeams.length > 1 ? 's' : ''}. Click to view.`
                  : teams.length === 0
                  ? 'Create your first team'
                  : 'View your teams'
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#b91c1c] flex items-center justify-center relative">
                  <Users className="h-5 w-5 text-white" />
                  {/* Draft indicator dot */}
                  {hasDraftTeams && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#18181b]" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider group-hover:text-gray-400 transition-colors">My Teams</p>
                  <p className="font-broadcast text-2xl text-white">{teams.length}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto" />
              </div>
            </button>

            {/* Total HRs */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d97706] flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-[#0c0c0c]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total HRs</p>
                  <p className="font-broadcast text-2xl text-[#d97706]">{totalHRs}</p>
                </div>
              </div>
            </div>

            {/* Season */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Season</p>
                  <p className="font-broadcast text-2xl text-white">{season?.seasonYear || new Date().getFullYear()}</p>
                </div>
              </div>
            </div>

            {/* Best Team */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 flex items-center justify-center">
                  <span className="text-lg">⚾</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Best Team</p>
                  {bestTeam ? (
                    <p className="font-medium text-white truncate">{bestTeam.name}</p>
                  ) : (
                    <p className="text-gray-600">-</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid - Leaderboards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overall Leaderboard Widget */}
          <LeaderboardWidget type="overall" userTeamIds={teams.map(t => t.id)} />

          {/* Monthly Leaderboard Widget */}
          <LeaderboardWidget type="monthly" userTeamIds={teams.map(t => t.id)} />
        </div>

        {/* No Teams CTA */}
        {!teamsLoading && teams.length === 0 && isRegistrationOpen && (
          <div className="mt-6 bg-[#18181b] border border-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
              <span className="text-3xl">⚾</span>
            </div>
            <h3 className="font-broadcast text-xl text-white mb-2">STEP UP TO THE PLATE</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
              Draft your first lineup and join the competition. Pick 8 players and compete for the top spot.
            </p>
            <Button
              onClick={() => navigate('/create-team')}
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none"
            >
              Create Your Team
            </Button>
          </div>
        )}
      </main>

      {/* Draft Teams Modal */}
      {showDraftModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDraftModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="draft-modal-title"
        >
          <div
            className="bg-[#18181b] border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-amber-500" />
                <h2 id="draft-modal-title" className="font-broadcast text-xl text-white">
                  DRAFT TEAMS
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  to="/my-teams"
                  onClick={() => setShowDraftModal(false)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Open full page"
                  title="Open full page"
                >
                  <Maximize2 className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 mb-5">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  These teams are in draft status. Complete your payment to enter the competition.
                </p>
              </div>

              <div className="space-y-3">
                {draftTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-4 bg-[#0c0c0c] border border-white/5"
                  >
                    {/* Team Name & HRs */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-white">{team.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-broadcast text-lg text-[#d97706]">{team.totalHrs2024 || 0}</span>
                        <span className="text-xs text-gray-500">HRs</span>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 uppercase text-xs font-medium px-2 py-1 bg-amber-500/10 border border-amber-500/20">
                        {team.paymentStatus}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={() => {
                          setShowDraftModal(false)
                          navigate('/my-teams', { state: { editTeamId: team.id } })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowDraftModal(false)
                          navigate('/my-teams', { state: { expandTeamId: team.id } })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#b91c1c] text-white text-sm hover:bg-[#991b1b] transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            {isRegistrationOpen && (
              <div className="p-5 border-t border-white/10 flex-shrink-0">
                <Button
                  onClick={() => {
                    setShowDraftModal(false)
                    navigate('/create-team')
                  }}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none px-5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
