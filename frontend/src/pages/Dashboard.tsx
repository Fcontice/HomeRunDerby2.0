import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { LeaderboardWidget } from '../components/leaderboard'
import { DingerJumbotron } from '../components/dashboard/DingerJumbotron'
import { NewsBoard } from '../components/dashboard/NewsBoard'
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
  TrendingUp,
} from 'lucide-react'

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const start = ref.current
    const diff = value - start
    const duration = 600
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const current = Math.round(start + diff * eased)
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(animate)
      else ref.current = value
    }
    requestAnimationFrame(animate)
  }, [value])

  return <span className={className}>{display}</span>
}

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

  // Extract all player IDs across user's teams (for news board highlighting)
  const userPlayerIds = teams.flatMap(
    t => t.teamPlayers?.map(tp => tp.player.id) || []
  )

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8 opacity-0 animate-slide-left">
          <div className="inline-block broadcast-lower-third px-6 py-2 mb-3">
            <h1 className="font-broadcast text-3xl md:text-4xl text-white tracking-wide">
              WELCOME BACK, {user?.username?.toUpperCase()}
            </h1>
          </div>
          <p className="text-muted-foreground ml-1">
            {isRegistrationOpen
              ? "Registration is open. Draft your team and compete!"
              : "Track your teams and watch the leaderboard."}
          </p>
        </div>

        {/* Scoreboard Stats Bar */}
        <div className="mb-8 opacity-0 animate-fade-up stagger-2">
          <div className="broadcast-score-box">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
              {/* Teams Count */}
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
                className="p-4 md:p-6 text-left hover:bg-white/5 transition-colors group relative"
                aria-label={
                  hasDraftTeams
                    ? `You have ${draftTeams.length} draft team${draftTeams.length > 1 ? 's' : ''}. Click to view.`
                    : teams.length === 0
                    ? 'Create your first team'
                    : 'View your teams'
                }
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-red flex items-center justify-center relative">
                    <Users className="h-5 w-5 text-white" />
                    {hasDraftTeams && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-[hsl(0_0%_4%)] animate-live-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">My Teams</p>
                    <div className="font-broadcast text-3xl text-white">
                      <AnimatedNumber value={teams.length} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto" />
                </div>
              </button>

              {/* Total HRs */}
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-amber flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-surface-base" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">
                      <span className="opacity-60 mr-0.5">&#9918;</span> Total HRs
                    </p>
                    <div className="font-broadcast text-3xl text-accent-amber">
                      <AnimatedNumber value={totalHRs} />
                    </div>
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
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Season</p>
                    <p className="font-broadcast text-3xl text-white">{season?.seasonYear || new Date().getFullYear()}</p>
                  </div>
                </div>
              </div>

              {/* Best Team */}
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-green flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Best Team</p>
                    {bestTeam ? (
                      <p className="font-medium text-white truncate text-sm mt-0.5">{bestTeam.name}</p>
                    ) : (
                      <p className="text-white/30 font-broadcast text-xl">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dinger Alert Jumbotron */}
        {season?.phase === 'active' && <DingerJumbotron seasonYear={season.seasonYear} />}

        {/* Daily News Board */}
        {season?.phase === 'active' && (
          <div className="mb-6 opacity-0 animate-fade-up stagger-3">
            <NewsBoard userPlayerIds={userPlayerIds} />
          </div>
        )}

        {/* Baseball stitch divider */}
        <div className="baseball-divider my-4" />

        {/* Main Content Grid - Leaderboards */}
        <div className="grid gap-6 lg:grid-cols-2 opacity-0 animate-fade-up stagger-4">
          {/* Overall Leaderboard Widget */}
          <LeaderboardWidget type="overall" userTeamIds={teams.map(t => t.id)} />

          {/* Monthly Leaderboard Widget */}
          <LeaderboardWidget type="monthly" userTeamIds={teams.map(t => t.id)} />
        </div>

        {/* No Teams CTA */}
        {!teamsLoading && teams.length === 0 && isRegistrationOpen && (
          <div className="mt-6 bg-surface-card border border-border p-8 text-center opacity-0 animate-fade-up stagger-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
              <span className="text-3xl">&#9918;</span>
            </div>
            <h3 className="font-broadcast text-xl text-white mb-2 flex items-center justify-center gap-2">
              <span className="diamond-accent" />
              STEP UP TO THE PLATE
              <span className="diamond-accent" />
            </h3>
            <p className="text-muted-foreground text-sm mb-2 max-w-xs mx-auto">
              Draft your first lineup and join the competition.
            </p>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Pick 8 sluggers &#127935; and swing for the fences.
            </p>
            <Button
              onClick={() => navigate('/create-team')}
              className="bg-brand-red hover:bg-brand-red-dark text-white"
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
            className="bg-surface-card border border-border w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
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
                  className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Open full page"
                  title="Open full page"
                >
                  <Maximize2 className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => setShowDraftModal(false)}
                  className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
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
                    className="p-4 bg-surface-base border border-white/5"
                  >
                    {/* Team Name & HRs */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-white">{team.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-broadcast text-lg text-accent-amber">{team.totalHrs2024 || 0}</span>
                        <span className="text-xs text-muted-foreground">HRs</span>
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-border text-white text-sm hover:bg-white/10 transition-colors"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowDraftModal(false)
                          navigate('/my-teams', { state: { expandTeamId: team.id } })
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-red text-white text-sm hover:bg-brand-red-dark transition-colors"
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
              <div className="p-5 border-t border-border flex-shrink-0">
                <Button
                  onClick={() => {
                    setShowDraftModal(false)
                    navigate('/create-team')
                  }}
                  className="bg-brand-red hover:bg-brand-red-dark text-white px-5"
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
