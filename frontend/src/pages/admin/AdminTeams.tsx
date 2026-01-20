import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi, AdminTeam } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Badge } from '../../components/ui/badge'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Loader2, MoreHorizontal, Check, X, RefreshCw, Eye, StickyNote } from 'lucide-react'

const paymentStatusColors: Record<string, string> = {
  draft: 'bg-slate-500',
  pending: 'bg-yellow-500',
  paid: 'bg-green-500',
  rejected: 'bg-red-500',
  refunded: 'bg-blue-500',
}

const entryStatusColors: Record<string, string> = {
  draft: 'bg-slate-500',
  entered: 'bg-green-500',
  locked: 'bg-purple-500',
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

  // Payment notes dialog state
  const [showPaymentNotesDialog, setShowPaymentNotesDialog] = useState(false)
  const [paymentNotesTeam, setPaymentNotesTeam] = useState<AdminTeam | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [pendingPaymentStatus, setPendingPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [paymentStatus, entryStatus])

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
    // Destructive actions require re-auth
    if (newStatus === 'rejected' || newStatus === 'refunded') {
      setPendingAction({ teamId, status: newStatus })
      setShowReAuth(true)
    } else if (newStatus === 'paid' && team) {
      // Show payment notes dialog for approval
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
      <div>
        <h1 className="text-3xl font-bold text-white">Team Management</h1>
        <p className="text-slate-400">View and manage all teams</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select value={entryStatus} onValueChange={setEntryStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entry Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="entered">Entered</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search by team or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-sm"
          />
          <Button onClick={handleSearch} variant="secondary">
            Search
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-800">
              <TableRow>
                <TableHead className="text-slate-300">Team Name</TableHead>
                <TableHead className="text-slate-300">Owner</TableHead>
                <TableHead className="text-slate-300">Players</TableHead>
                <TableHead className="text-slate-300">HR Cap</TableHead>
                <TableHead className="text-slate-300">Payment</TableHead>
                <TableHead className="text-slate-300">Entry</TableHead>
                <TableHead className="text-slate-300">Created</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                    No teams found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeams.map((team) => (
                  <TableRow key={team.id} className="bg-slate-800/50 hover:bg-slate-800">
                    <TableCell className="font-medium text-white">
                      {team.name}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div>
                        <p>{team.user?.username}</p>
                        <p className="text-xs text-slate-500">{team.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {team.teamPlayers?.length || 0}/8
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {team.totalHrs2024}/172
                    </TableCell>
                    <TableCell>
                      <Badge className={paymentStatusColors[team.paymentStatus]}>
                        {team.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-2 ${entryStatusColors[team.entryStatus].replace('bg-', 'border-')}`}>
                        {team.entryStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTeam(team)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {(team.paymentStatus === 'pending' || team.paymentStatus === 'draft') && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(team.id, 'paid', team)}
                              className="text-green-400"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve Payment
                            </DropdownMenuItem>
                          )}
                          {(team.paymentStatus === 'pending' || team.paymentStatus === 'draft') && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(team.id, 'rejected')}
                              className="text-red-400"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          )}
                          {team.paymentStatus === 'paid' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(team.id, 'refunded')}
                              className="text-blue-400"
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Mark Refunded
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Owner</p>
                  <p className="text-white">{selectedTeam.user?.username}</p>
                  <p className="text-sm text-slate-500">{selectedTeam.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">HR Cap</p>
                  <p className="text-white">{selectedTeam.totalHrs2024}/172</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-2">Players</p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTeam.teamPlayers?.map((tp: any) => (
                    <div
                      key={tp.id}
                      className="bg-slate-700/50 rounded p-2 flex justify-between"
                    >
                      <span className="text-white">{tp.player?.name || 'Unknown'}</span>
                      <span className="text-slate-400">{tp.player?.hrsTotal || 0} HR</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedTeam.paymentNotes && (
                <div>
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />
                    Payment Notes
                  </p>
                  <p className="text-white text-sm bg-slate-700/50 p-2 rounded mt-1">{selectedTeam.paymentNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Notes Dialog */}
      <Dialog open={showPaymentNotesDialog} onOpenChange={setShowPaymentNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Mark team "{paymentNotesTeam?.name}" as paid. Add optional payment notes for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Payment Notes (optional)</Label>
              <Textarea
                id="paymentNotes"
                placeholder="e.g., Venmo payment received 1/15, Zelle from john@email.com"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-slate-500">
                Record how payment was received for future reference
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentNotesDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentNotesConfirm} className="bg-green-600 hover:bg-green-700">
              <Check className="mr-2 h-4 w-4" />
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
