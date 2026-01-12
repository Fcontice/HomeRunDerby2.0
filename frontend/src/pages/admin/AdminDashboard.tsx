import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, AdminStats } from '../../services/api'
import StatsCard from '../../components/admin/StatsCard'
import ReAuthModal from '../../components/admin/ReAuthModal'
import SeasonCard from '../../components/admin/SeasonCard'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  Trophy,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // End season modal state
  const [showEndSeason, setShowEndSeason] = useState(false)
  const [showReAuth, setShowReAuth] = useState(false)
  const [endSeasonConfirm, setEndSeasonConfirm] = useState('')
  const [endingSeason, setEndingSeason] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getStats()
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        setError(result.error?.message || 'Failed to load stats')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  const handleEndSeasonClick = () => {
    setShowReAuth(true)
  }

  const handleReAuthSuccess = () => {
    setShowEndSeason(true)
  }

  const handleEndSeason = async () => {
    if (endSeasonConfirm !== 'END SEASON' || !stats) return

    setEndingSeason(true)
    try {
      const result = await adminApi.endSeason(stats.seasonYear)
      if (result.success) {
        setShowEndSeason(false)
        setEndSeasonConfirm('')
        loadStats() // Refresh stats
      } else {
        setError(result.error?.message || 'Failed to end season')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to end season')
    } finally {
      setEndingSeason(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        <p>{error}</p>
        <Button onClick={loadStats} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Season {stats.seasonYear} Overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Teams"
          value={stats.totalTeams}
          icon={Trophy}
        />
        <StatsCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          icon={Clock}
          variant={stats.pendingApprovals > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Active Users"
          value={stats.activeUsers}
          icon={Users}
          description={`${stats.totalUsers} total`}
        />
      </div>

      {/* Season Management */}
      <SeasonCard />

      {/* Teams by Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Teams by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(stats.teamsByPaymentStatus).map(([status, count]) => (
              <div
                key={status}
                className="bg-slate-700/50 rounded-lg p-4 text-center"
              >
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-sm text-slate-400 capitalize">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link to="/admin/teams?paymentStatus=pending">
            <Button variant="outline">
              View Pending Teams ({stats.pendingApprovals})
            </Button>
          </Link>
          <Link to="/admin/notifications">
            <Button variant="outline">Send Notification</Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleEndSeasonClick}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            End Season
          </Button>
        </CardContent>
      </Card>

      {/* Re-Auth Modal */}
      <ReAuthModal
        open={showReAuth}
        onOpenChange={setShowReAuth}
        onSuccess={handleReAuthSuccess}
        title="End Season"
        description="This is a destructive action. Please verify your identity."
      />

      {/* End Season Confirmation Modal */}
      <Dialog open={showEndSeason} onOpenChange={setShowEndSeason}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              End Season Early?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>This will:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Lock all team modifications</li>
                <li>Freeze the leaderboard</li>
                <li>Mark season {stats.seasonYear} as complete</li>
              </ul>
              <p className="font-semibold text-red-400 pt-2">
                This action cannot be undone.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">
                Type "END SEASON" to confirm:
              </p>
              <Input
                value={endSeasonConfirm}
                onChange={(e) => setEndSeasonConfirm(e.target.value)}
                placeholder="END SEASON"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEndSeason(false)
                  setEndSeasonConfirm('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleEndSeason}
                disabled={endSeasonConfirm !== 'END SEASON' || endingSeason}
              >
                {endingSeason && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                End Season
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
