import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, AdminTeam } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import {
  Loader2,
  MoreHorizontal,
  Check,
  X,
  RefreshCw,
  Eye,
  StickyNote,
  Search,
  ChevronDown,
} from 'lucide-react'

const paymentStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  refunded: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
}

const entryStatusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  entered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  locked: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
}

export default function AdminTeams() {
  const [searchParams] = useSearchParams()
  const [teams, setTeams] = useState<AdminTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || 'all')
  const [entryStatus, setEntryStatus] = useState(searchParams.get('entryStatus') || 'all')
  const [search, setSearch] = useState('')

  // Modal state
  const [showReAuth, setShowReAuth] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ teamId: string; status: string; notes?: string } | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<AdminTeam | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  // Payment notes dialog state
  const [showPaymentNotesDialog, setShowPaymentNotesDialog] = useState(false)
  const [paymentNotesTeam, setPaymentNotesTeam] = useState<AdminTeam | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [paymentStatus, entryStatus])

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getTeams({
        paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
        entryStatus: entryStatus !== 'all' ? entryStatus : undefined,
        search: search || undefined,
      })
      if (result.success && result.data) {
        setTeams(result.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadTeams()
  }

  const handleStatusChange = (teamId: string, newStatus: string, team?: AdminTeam) => {
    setActiveDropdown(null)
    if (newStatus === 'rejected' || newStatus === 'refunded') {
      setPendingAction({ teamId, status: newStatus })
      setShowReAuth(true)
    } else if (newStatus === 'paid' && team) {
      setPaymentNotesTeam(team)
      setPaymentNotes(team.paymentNotes || '')
      setPendingPaymentStatus(newStatus)
      setShowPaymentNotesDialog(true)
    } else {
      executeStatusChange(teamId, newStatus)
    }
  }

  const handlePaymentNotesConfirm = () => {
    if (paymentNotesTeam && pendingPaymentStatus) {
      executeStatusChange(paymentNotesTeam.id, pendingPaymentStatus, paymentNotes)
      setShowPaymentNotesDialog(false)
      setPaymentNotesTeam(null)
      setPaymentNotes('')
      setPendingPaymentStatus(null)
    }
  }

  const handleReAuthSuccess = () => {
    if (pendingAction) {
      executeStatusChange(pendingAction.teamId, pendingAction.status, pendingAction.notes)
      setPendingAction(null)
    }
  }

  const executeStatusChange = async (teamId: string, newStatus: string, notes?: string) => {
    try {
      const result = await adminApi.updateTeamStatus(teamId, newStatus, notes)
      if (result.success) {
        loadTeams()
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update status')
    }
  }

  const filteredTeams = search
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.user?.username?.toLowerCase().includes(search.toLowerCase()) ||
          t.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : teams

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Team Management</h1>
        <p className="text-sm text-slate-400 mt-1">View and manage all teams</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="appearance-none bg-[#1e293b] border border-white/10 text-white text-sm pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Payments</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="rejected">Rejected</option>
            <option value="refunded">Refunded</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={entryStatus}
            onChange={(e) => setEntryStatus(e.target.value)}
            className="appearance-none bg-[#1e293b] border border-white/10 text-white text-sm pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Entries</option>
            <option value="draft">Draft</option>
            <option value="entered">Entered</option>
            <option value="locked">Locked</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by team or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-[#1e293b] border border-white/10 text-white text-sm pl-10 pr-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="bg-[#1e293b] border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Team Name</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Owner</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Players</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">HR Cap</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Payment</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Entry</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Created</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTeams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-400 py-12">
                      No teams found
                    </td>
                  </tr>
                ) : (
                  filteredTeams.map((team) => {
                    const paymentColors = paymentStatusColors[team.paymentStatus] || paymentStatusColors.draft
                    const entryColors = entryStatusColors[team.entryStatus] || entryStatusColors.draft
                    return (
                      <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-sm font-medium text-white">{team.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm text-slate-300">{team.user?.username}</p>
                            <p className="text-xs text-slate-500">{team.user?.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-300 font-mono">{team.teamPlayers?.length || 0}/8</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-300 font-mono">{team.totalHrs2024}/172</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium ${paymentColors.bg} ${paymentColors.text} border ${paymentColors.border}`}>
                            {team.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium ${entryColors.bg} ${entryColors.text} border ${entryColors.border}`}>
                            {team.entryStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-400">
                            {new Date(team.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveDropdown(activeDropdown === team.id ? null : team.id)
                              }}
                              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeDropdown === team.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0f172a] border border-white/10 shadow-xl z-10">
                                <button
                                  onClick={() => { setSelectedTeam(team); setActiveDropdown(null) }}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                {(team.paymentStatus === 'pending' || team.paymentStatus === 'draft') && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(team.id, 'paid', team)}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                      Approve Payment
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(team.id, 'rejected')}
                                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                      Reject
                                    </button>
                                  </>
                                )}
                                {team.paymentStatus === 'paid' && (
                                  <button
                                    onClick={() => handleStatusChange(team.id, 'refunded')}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Mark Refunded
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Re-Auth Modal */}
      <ReAuthModal
        open={showReAuth}
        onOpenChange={(open) => {
          setShowReAuth(open)
          if (!open) setPendingAction(null)
        }}
        onSuccess={handleReAuthSuccess}
        title="Confirm Action"
        description={`You are about to ${pendingAction?.status} this team. This action requires verification.`}
      />

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white">{selectedTeam.name}</h3>
              <button
                onClick={() => setSelectedTeam(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Owner</p>
                  <p className="text-white">{selectedTeam.user?.username}</p>
                  <p className="text-sm text-slate-500">{selectedTeam.user?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">HR Cap</p>
                  <p className="text-white font-mono">{selectedTeam.totalHrs2024}/172</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Players</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTeam.teamPlayers?.map((tp: any) => (
                    <div
                      key={tp.id}
                      className="bg-[#0f172a] border border-white/5 p-3 flex justify-between items-center"
                    >
                      <span className="text-sm text-white">{tp.player?.name || 'Unknown'}</span>
                      <span className="text-sm text-cyan-400 font-mono">{tp.player?.hrsTotal || 0} HR</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedTeam.paymentNotes && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Payment Notes
                  </p>
                  <p className="text-sm text-slate-300 bg-[#0f172a] border border-white/5 p-3">
                    {selectedTeam.paymentNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Notes Dialog */}
      {showPaymentNotesDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md">
            <div className="p-5 border-b border-white/5">
              <h3 className="font-semibold text-white">Approve Payment</h3>
              <p className="text-sm text-slate-400 mt-1">
                Mark team "{paymentNotesTeam?.name}" as paid. Add optional payment notes for tracking.
              </p>
            </div>
            <div className="p-5">
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-2">
                Payment Notes (optional)
              </label>
              <textarea
                placeholder="e.g., Venmo payment received 1/15, Zelle from john@email.com"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm px-4 py-3 min-h-[100px] placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                Record how payment was received for future reference
              </p>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setShowPaymentNotesDialog(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentNotesConfirm}
                className="px-4 py-2 text-sm bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Approve Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
