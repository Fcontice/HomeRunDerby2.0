import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSeason } from '../contexts/SeasonContext'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { LeaderboardWidget } from '../components/leaderboard'
import { Navbar } from '../components/Navbar'
import { teamsApi, Team } from '../services/api'
import { Users, Trophy } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            {isRegistrationOpen
              ? "Registration is open. Draft your team and compete!"
              : "Track your teams and watch the leaderboard."}
          </p>
        </div>

        {/* Quick Stats */}
        {teams.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card className="animate-fade-up stagger-1">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">My Teams</p>
                    <p className="text-2xl font-bold">{teams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="animate-fade-up stagger-2">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gold/10">
                    <Trophy className="h-6 w-6 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Home Runs</p>
                    <p className="text-2xl font-bold stat-gold">{totalHRs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="animate-fade-up stagger-3">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <span className="text-2xl">⚾</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Season</p>
                    <p className="text-2xl font-bold">{season?.seasonYear || new Date().getFullYear()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Teams Card */}
          <Card className="animate-fade-up stagger-2">
            <CardHeader>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Your fantasy baseball teams</CardDescription>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-lg bg-slate-800/50 animate-pulse">
                      <div className="h-4 w-32 bg-slate-700 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-slate-700/50 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : teams.length === 0 ? (
                <EmptyState
                  icon="⚾"
                  title="Step up to the plate!"
                  description="Draft your first lineup and join the competition. Pick 8 players and compete for the top spot."
                  action={{
                    label: 'Create Team',
                    onClick: () => navigate('/create-team'),
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {teams.map((team, index) => (
                    <Link
                      key={team.id}
                      to={`/teams/${team.id}`}
                      className={`block p-4 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-200 animate-fade-up stagger-${index + 1}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground">{team.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {team.seasonYear} Season
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold stat-gold">{team.totalHomeRuns || 0}</p>
                            <p className="text-xs text-muted-foreground">HRs</p>
                          </div>
                          <Badge
                            variant={
                              team.paymentStatus === 'paid'
                                ? 'default'
                                : team.paymentStatus === 'pending'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {team.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {isRegistrationOpen && (
                    <Button
                      onClick={() => navigate('/create-team')}
                      variant="outline"
                      className="w-full mt-2"
                    >
                      Create Another Team
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard Widget */}
          <div className="animate-fade-up stagger-3">
            <LeaderboardWidget />
          </div>
        </div>
      </main>
    </div>
  )
}
