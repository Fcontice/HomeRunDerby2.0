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
import { LeaderboardWidget } from '../components/leaderboard'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { season } = useSeason()
  const navigate = useNavigate()

  const isRegistrationOpen = season?.phase === 'registration'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-8">
          <div className="flex items-center gap-8">
            <h1 className="text-4xl font-bold text-white">Home Run Derby</h1>
            <nav className="flex gap-4">
              <Link
                to="/dashboard"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/players"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Players
              </Link>
              <Link
                to="/leaderboard"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Leaderboard
              </Link>
              {isRegistrationOpen ? (
                <Link
                  to="/create-team"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  Create Team
                </Link>
              ) : (
                <span className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
                  Create Team
                  <Badge variant="secondary" className="text-xs">
                    Closed
                  </Badge>
                </span>
              )}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {user?.username}!</CardTitle>
              <CardDescription>Your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user?.role}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auth Provider</p>
                <p className="font-medium capitalize">{user?.authProvider}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Teams</CardTitle>
              <CardDescription>Your fantasy baseball teams</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                No teams created yet. Create your first team to compete!
              </p>
              <Button onClick={() => navigate('/create-team')} className="w-full">
                Create Your First Team
              </Button>
            </CardContent>
          </Card>

          <LeaderboardWidget />
        </div>

      </div>
    </div>
  )
}
