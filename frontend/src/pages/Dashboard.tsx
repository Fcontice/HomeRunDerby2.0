import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { LeaderboardWidget } from '../components/leaderboard'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
              <Link
                to="/create-team"
                className="text-white hover:text-gray-300 transition-colors"
              >
                Create Team
              </Link>
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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Phase 3 Complete!</CardTitle>
            <CardDescription>Stats, scoring, and leaderboards are fully functional</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>MLB-StatsAPI integration for live stats</li>
              <li>Daily home run tracking with game-by-game data</li>
              <li>Team scoring with "best 7 of 8" algorithm</li>
              <li>Overall and monthly leaderboards</li>
              <li>Player stats dashboard with season totals</li>
              <li>Leaderboard caching for performance</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              Next up: Phase 4 - Admin dashboard and automated stats updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
