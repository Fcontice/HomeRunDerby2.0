import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { LeaderboardWidget } from '../components/leaderboard'
import { Navbar } from '../components/Navbar'
import { teamsApi, Team } from '../services/api'
import { Users, Trophy, Plus, ChevronRight, Calendar } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)

  const isRegistrationOpen = season?.phase === 'registration'

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
  const totalHRs = teams.reduce((sum, team) => sum + (team.totalHomeRuns || 0), 0)

  // Find best performing team
  const bestTeam = teams.length > 0
    ? teams.reduce((best, team) => (team.totalHomeRuns || 0) > (best.totalHomeRuns || 0) ? team : best)
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
            {/* Teams Count */}
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#b91c1c] flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">My Teams</p>
                  <p className="font-broadcast text-2xl text-white">{teams.length}</p>
                </div>
              </div>
            </div>

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

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Teams Section */}
          <div className="bg-[#18181b] border border-white/10">
            {/* Section Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#b91c1c]" />
                <h2 className="font-broadcast text-xl text-white">MY TEAMS</h2>
              </div>
              {isRegistrationOpen && teams.length > 0 && (
                <Button
                  onClick={() => navigate('/create-team')}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none h-8 px-3 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Team
                </Button>
              )}
            </div>

            {/* Teams List */}
            <div className="p-4">
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 bg-[#0c0c0c] border border-white/5 animate-pulse">
                      <div className="h-4 w-32 bg-white/5 mb-2"></div>
                      <div className="h-3 w-24 bg-white/5"></div>
                    </div>
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-12">
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
              ) : (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      to="/my-teams"
                      className="block p-4 bg-[#0c0c0c] border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-[#b91c1c] flex items-center justify-center flex-shrink-0">
                            <span className="font-broadcast text-sm text-white">
                              {team.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{team.name}</p>
                            <p className="text-xs text-gray-500">
                              {team.seasonYear} Season
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-broadcast text-2xl text-[#d97706]">{team.totalHomeRuns || 0}</p>
                            <p className="text-xs text-gray-500">HRs</p>
                          </div>
                          <div className={`px-2 py-1 text-xs uppercase tracking-wider ${
                            team.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : team.paymentStatus === 'pending'
                                ? 'bg-[#d97706]/20 text-[#d97706] border border-[#d97706]/30'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                          }`}>
                            {team.paymentStatus}
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard Widget */}
          <LeaderboardWidget userTeamIds={teams.map(t => t.id)} />
        </div>
      </main>
    </div>
  )
}
