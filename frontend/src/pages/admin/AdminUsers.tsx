import { useState, useEffect } from 'react'
import { adminApi, AdminUser } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import {
  Loader2,
  MoreHorizontal,
  CheckCircle,
  Mail,
  Trash2,
  Eye,
  AlertTriangle,
  Search,
  X,
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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
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
    setActiveDropdown(null)
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
    setActiveDropdown(null)
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
    setActiveDropdown(null)
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">User Management</h1>
        <p className="text-sm text-slate-400 mt-1">View and manage all users</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by username or email..."
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

      {/* Success Message */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {actionSuccess}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
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
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Username</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Phone</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Role</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Teams</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Joined</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-400 py-12">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-white">{user.username}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-300">{user.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-400">{user.phoneNumber || '-'}</span>
                      </td>
                      <td className="px-5 py-4">
                        {user.emailVerified ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-300 font-mono">{user.teamCount || 0}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-400">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveDropdown(activeDropdown === user.id ? null : user.id)
                            }}
                            disabled={actionLoading}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {activeDropdown === user.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#0f172a] border border-white/10 shadow-xl z-10">
                              <button
                                onClick={() => { setSelectedUser(user); setActiveDropdown(null) }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {!user.emailVerified && (
                                <button
                                  onClick={() => handleVerifyEmail(user.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Verify Email
                                </button>
                              )}
                              <button
                                onClick={() => handleSendPasswordReset(user.id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                                Send Password Reset
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => handleDeleteClick(user.id)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
          if (!open) setPendingDelete(null)
        }}
        onSuccess={handleReAuthSuccess}
        title="Delete User"
        description="This is a destructive action. Please verify your identity."
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md">
            <div className="p-5 border-b border-white/5">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold">Confirm Delete User</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-300">
                Are you sure you want to delete this user? This will soft-delete the user
                and all their associated data. This action can be reversed by an admin.
              </p>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setPendingDelete(null)
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={actionLoading}
                className="px-4 py-2 text-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] border border-white/10 w-full max-w-md">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white">{selectedUser.username}</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm text-white">{selectedUser.phoneNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email Verified</p>
                  <p className="text-sm text-white">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Role</p>
                  <p className="text-sm text-white capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Teams</p>
                  <p className="text-sm text-white font-mono">{selectedUser.teamCount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Joined</p>
                  <p className="text-sm text-white">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Last Login</p>
                  <p className="text-sm text-white">
                    {selectedUser.lastLoginAt
                      ? new Date(selectedUser.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              {selectedUser.googleId && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Google Account</p>
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Connected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
