import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, AdminStats } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import SeasonCard from '../../components/admin/SeasonCard'
import {
  Trophy,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Bell,
  TrendingUp,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Lock teams modal state
  const [showLockTeams, setShowLockTeams] = useState(false)
  const [showReAuth, setShowReAuth] = useState(false)
  const [lockTeamsConfirm, setLockTeamsConfirm] = useState('')
  const [lockingTeams, setLockingTeams] = useState(false)

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

  const handleLockTeamsClick = () => {
    setShowReAuth(true)
  }

  const handleReAuthSuccess = () => {
    setShowLockTeams(true)
  }

  const handleLockTeams = async () => {
    if (lockTeamsConfirm !== 'LOCK TEAMS' || !stats) return

    setLockingTeams(true)
    try {
      const result = await adminApi.lockTeams(stats.seasonYear)
      if (result.success) {
        setShowLockTeams(false)
        setLockTeamsConfirm('')
        loadStats()
      } else {
        setError(result.error?.message || 'Failed to lock teams')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to lock teams')
    } finally {
      setLockingTeams(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 mb-4">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
        <div>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: 'Total Teams',
      value: stats.totalTeams,
      icon: Trophy,
      color: 'cyan',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      text: 'text-cyan-400',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'amber',
      bg: stats.pendingApprovals > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10',
      border: stats.pendingApprovals > 0 ? 'border-amber-500/20' : 'border-slate-500/20',
      text: stats.pendingApprovals > 0 ? 'text-amber-400' : 'text-slate-400',
    },
    {
      label: 'Revenue',
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
    },
    {
      label: 'Active Users',
      value: stats.activeUsers,
      icon: Users,
      color: 'violet',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-400',
      subtext: `${stats.totalUsers} total`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Season {stats.seasonYear} Overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-400">Live Data</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`${stat.bg} border ${stat.border} p-5`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-semibold ${stat.text} mt-2 font-mono`}>
                    {stat.value}
                  </p>
                  {stat.subtext && (
                    <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
                  )}
                </div>
                <div className={`p-2 ${stat.bg} border ${stat.border}`}>
                  <Icon className={`w-5 h-5 ${stat.text}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Season Management */}
      <SeasonCard />

      {/* Teams by Status */}
      <div className="bg-[#1e293b] border border-white/5">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Teams by Payment Status</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stats.teamsByPaymentStatus).map(([status, count]) => {
              const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                draft: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
                pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
                paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
                rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
                refunded: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
              }
              const colors = statusColors[status] || statusColors.draft
              return (
                <div
                  key={status}
                  className={`${colors.bg} border ${colors.border} p-4 text-center`}
                >
                  <p className={`text-2xl font-semibold font-mono ${colors.text}`}>{count}</p>
                  <p className="text-xs text-slate-500 capitalize mt-1">{status}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#1e293b] border border-white/5">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="p-5 flex flex-wrap gap-3">
          <Link
            to="/admin/teams?paymentStatus=pending"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors group"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm">View Pending Teams ({stats.pendingApprovals})</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            to="/admin/notifications"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors group"
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm">Send Notification</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <button
            onClick={handleLockTeamsClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Lock Teams</span>
          </button>
        </div>
      </div>

      {/* Re-Auth Modal */}
      <ReAuthModal
        open={showReAuth}
        onOpenChange={setShowReAuth}
        onSuccess={handleReAuthSuccess}
        title="Lock Teams"
        description="This is a destructive action. Please verify your identity."
      />

      {/* Lock Teams Confirmation Modal */}
      {showLockTeams && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Lock All Teams?</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-300 space-y-2">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Lock all team modifications</li>
                  <li>Prevent any further roster changes</li>
                  <li>Apply to all paid teams in season {stats.seasonYear}</li>
                </ul>
                <p className="text-red-400 font-medium pt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Type "LOCK TEAMS" to confirm:
                </label>
                <input
                  value={lockTeamsConfirm}
                  onChange={(e) => setLockTeamsConfirm(e.target.value)}
                  placeholder="LOCK TEAMS"
                  className="w-full bg-[#0f172a] border border-white/10 text-white px-4 py-2.5 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLockTeams(false)
                  setLockTeamsConfirm('')
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLockTeams}
                disabled={lockTeamsConfirm !== 'LOCK TEAMS' || lockingTeams}
                className="px-4 py-2 text-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {lockingTeams && <Loader2 className="w-4 h-4 animate-spin" />}
                Lock Teams
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
