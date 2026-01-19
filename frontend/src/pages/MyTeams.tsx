import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { teamsApi, Team } from '../services/api'
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
  ChevronRight,
} from 'lucide-react'

export default function MyTeams() {
  const { user } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />
      case 'refunded':
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
      default:
        return <Edit className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getEntryBadge = (entryStatus: string) => {
    switch (entryStatus) {
      case 'locked':
        return (
          <Badge variant="secondary" className="bg-slate-600">
            <Lock className="w-3 h-3 mr-1" />
            Locked
          </Badge>
        )
      case 'entered':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Trophy className="w-3 h-3 mr-1" />
            Live
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
            <p className="text-muted-foreground mt-1">
              Manage your fantasy baseball teams
            </p>
          </div>

          {isRegistrationOpen && (
            <Button onClick={() => navigate('/create-team')}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Team
            </Button>
          )}
        </div>

        {/* Teams List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-6 w-32 bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-24 bg-slate-700/50 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                {isRegistrationOpen
                  ? "Create your first team and join the competition!"
                  : "Registration is currently closed."}
              </p>
              {isRegistrationOpen && (
                <Button onClick={() => navigate('/create-team')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="cursor-pointer hover:border-slate-600 transition-all group"
                onClick={() => navigate(`/teams/${team.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate group-hover:text-primary transition-colors">
                        {team.name}
                      </CardTitle>
                      <CardDescription>
                        {team.seasonYear} Season
                      </CardDescription>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(team.paymentStatus)}
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
                      {getEntryBadge(team.entryStatus)}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {team.totalHrs2024}
                      </p>
                      <p className="text-xs text-muted-foreground">HR Cap</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {teams.length > 0 && (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teams</p>
                    <p className="text-2xl font-bold">{teams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Teams</p>
                    <p className="text-2xl font-bold">
                      {teams.filter(t => t.paymentStatus === 'paid').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Edit className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Draft Teams</p>
                    <p className="text-2xl font-bold">
                      {teams.filter(t => t.paymentStatus === 'draft').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
