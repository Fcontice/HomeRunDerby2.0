import { useState, useEffect } from 'react'
import { adminApi, AdminUser } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  Loader2,
  MoreHorizontal,
  CheckCircle,
  Mail,
  Trash2,
  Eye,
  AlertTriangle,
} from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  // Modal state
  const [showReAuth, setShowReAuth] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getUsers({ search: search || undefined })
      if (result.success && result.data) {
        setUsers(result.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadUsers()
  }

  const handleVerifyEmail = async (userId: string) => {
    setActionLoading(true)
    try {
      const result = await adminApi.verifyUserEmail(userId)
      if (result.success) {
        setActionSuccess('Email verified successfully')
        loadUsers()
        setTimeout(() => setActionSuccess(''), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to verify email')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendPasswordReset = async (userId: string) => {
    setActionLoading(true)
    try {
      const result = await adminApi.sendPasswordReset(userId)
      if (result.success) {
        setActionSuccess('Password reset email sent')
        setTimeout(() => setActionSuccess(''), 3000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send password reset')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteClick = (userId: string) => {
    setPendingDelete(userId)
    setShowReAuth(true)
  }

  const handleReAuthSuccess = () => {
    setShowDeleteConfirm(true)
  }

  const executeDelete = async () => {
    if (!pendingDelete) return

    setActionLoading(true)
    try {
      const result = await adminApi.deleteUser(pendingDelete)
      if (result.success) {
        setShowDeleteConfirm(false)
        setPendingDelete(null)
        loadUsers()
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <p className="text-slate-400">View and manage all users</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by username or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} variant="secondary">
          Search
        </Button>
      </div>

      {/* Success Message */}
      {actionSuccess && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400">
          {actionSuccess}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError('')}
            className="ml-4"
          >
            Dismiss
          </Button>
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
                <TableHead className="text-slate-300">Username</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Role</TableHead>
                <TableHead className="text-slate-300">Teams</TableHead>
                <TableHead className="text-slate-300">Joined</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="bg-slate-800/50 hover:bg-slate-800">
                    <TableCell className="font-medium text-white">
                      {user.username}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge className="bg-green-500">Verified</Badge>
                      ) : (
                        <Badge className="bg-yellow-500">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.role === 'admin'
                            ? 'border-purple-500 text-purple-400'
                            : 'border-slate-500 text-slate-400'
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {user.teamCount || 0}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={actionLoading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {!user.emailVerified && (
                            <DropdownMenuItem
                              onClick={() => handleVerifyEmail(user.id)}
                              className="text-green-400"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Verify Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleSendPasswordReset(user.id)}
                            className="text-blue-400"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Password Reset
                          </DropdownMenuItem>
                          {user.role !== 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(user.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
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
          if (!open) setPendingDelete(null)
        }}
        onSuccess={handleReAuthSuccess}
        title="Delete User"
        description="This is a destructive action. Please verify your identity."
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open)
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Confirm Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This will soft-delete the user
              and all their associated data. This action can be reversed by an admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setPendingDelete(null)
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser?.username}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email Verified</p>
                  <p className="text-white">
                    {selectedUser.emailVerified ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Role</p>
                  <p className="text-white capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Teams</p>
                  <p className="text-white">{selectedUser.teamCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Joined</p>
                  <p className="text-white">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Last Login</p>
                  <p className="text-white">
                    {selectedUser.lastLoginAt
                      ? new Date(selectedUser.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              {selectedUser.googleId && (
                <div>
                  <p className="text-sm text-slate-400">Google Account</p>
                  <Badge className="bg-blue-500">Connected</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
