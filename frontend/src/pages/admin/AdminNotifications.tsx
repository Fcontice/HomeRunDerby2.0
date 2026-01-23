import { useState, useEffect } from 'react'
import { adminApi, RecipientCounts, ReminderStatus } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import {
  Loader2,
  Send,
  Users,
  Mail,
  CheckCircle,
  Bell,
  Calendar,
  CreditCard,
  Clock,
  ChevronDown,
} from 'lucide-react'

type PendingAction =
  | { type: 'notification'; recipientCount: number }
  | { type: 'payment_reminder'; statuses: ('draft' | 'pending')[] }
  | { type: 'lock_reminder'; lockDate: string }

export default function AdminNotifications() {
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null)
  const [reminderStatus, setReminderStatus] = useState<ReminderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state for custom notifications
  const [recipientType, setRecipientType] = useState<'group' | 'individual'>('group')
  const [recipientGroup, setRecipientGroup] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [userEmail, setUserEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Quick reminder state
  const [paymentStatuses, setPaymentStatuses] = useState<{ draft: boolean; pending: boolean }>({
    draft: true,
    pending: true,
  })
  const [lockDate, setLockDate] = useState('')

  // Re-auth state
  const [showReAuth, setShowReAuth] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [countsResult, statusResult] = await Promise.all([
        adminApi.getRecipientCounts(),
        adminApi.getReminderStatus(),
      ])
      if (countsResult.success && countsResult.data) {
        setRecipientCounts(countsResult.data)
      }
      if (statusResult.success && statusResult.data) {
        setReminderStatus(statusResult.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!subject.trim()) {
      setError('Subject is required')
      return
    }
    if (!body.trim()) {
      setError('Message body is required')
      return
    }
    if (recipientType === 'individual' && !userEmail.trim()) {
      setError('Email address is required for individual notifications')
      return
    }

    setPendingAction({ type: 'notification', recipientCount: getRecipientCount() })
    setShowReAuth(true)
  }

  const handlePaymentReminderClick = () => {
    setError('')
    const statuses: ('draft' | 'pending')[] = []
    if (paymentStatuses.draft) statuses.push('draft')
    if (paymentStatuses.pending) statuses.push('pending')

    if (statuses.length === 0) {
      setError('Select at least one payment status')
      return
    }

    setPendingAction({ type: 'payment_reminder', statuses })
    setShowReAuth(true)
  }

  const handleLockReminderClick = () => {
    setError('')
    if (!lockDate) {
      setError('Lock date is required')
      return
    }

    setPendingAction({ type: 'lock_reminder', lockDate })
    setShowReAuth(true)
  }

  const handleReAuthSuccess = async () => {
    if (!pendingAction) return

    setSending(true)
    setError('')
    setSuccess('')

    try {
      if (pendingAction.type === 'notification') {
        const result = await adminApi.sendNotifications({
          recipientGroup: recipientType === 'group' ? recipientGroup : undefined,
          userEmail: recipientType === 'individual' ? userEmail : undefined,
          subject,
          body,
        })

        if (result.success && result.data) {
          const { sentCount, failedCount } = result.data
          if (failedCount > 0) {
            setSuccess(`Sent ${sentCount} emails. ${failedCount} failed.`)
          } else {
            setSuccess(`Successfully sent ${sentCount} email${sentCount === 1 ? '' : 's'}!`)
          }
          setSubject('')
          setBody('')
          setUserEmail('')
        }
      } else if (pendingAction.type === 'payment_reminder') {
        const result = await adminApi.sendPaymentReminder(pendingAction.statuses)

        if (result.success && result.data) {
          const { sentCount, failedCount } = result.data
          if (failedCount > 0) {
            setSuccess(`Sent ${sentCount} payment reminder${sentCount === 1 ? '' : 's'}. ${failedCount} failed.`)
          } else {
            setSuccess(`Successfully sent ${sentCount} payment reminder${sentCount === 1 ? '' : 's'}!`)
          }
          const statusResult = await adminApi.getReminderStatus()
          if (statusResult.success && statusResult.data) {
            setReminderStatus(statusResult.data)
          }
        }
      } else if (pendingAction.type === 'lock_reminder') {
        const result = await adminApi.sendLockReminder(pendingAction.lockDate)

        if (result.success && result.data) {
          const { sentCount, failedCount } = result.data
          if (failedCount > 0) {
            setSuccess(`Sent ${sentCount} lock deadline reminder${sentCount === 1 ? '' : 's'}. ${failedCount} failed.`)
          } else {
            setSuccess(`Successfully sent ${sentCount} lock deadline reminder${sentCount === 1 ? '' : 's'}!`)
          }
          const statusResult = await adminApi.getReminderStatus()
          if (statusResult.success && statusResult.data) {
            setReminderStatus(statusResult.data)
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send')
    } finally {
      setSending(false)
      setPendingAction(null)
    }
  }

  const getRecipientCount = () => {
    if (!recipientCounts) return 0
    if (recipientType === 'individual') return 1
    return recipientCounts[recipientGroup] || 0
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getReAuthDescription = () => {
    if (!pendingAction) return ''

    if (pendingAction.type === 'notification') {
      return `You are about to send an email to ${pendingAction.recipientCount} user${pendingAction.recipientCount === 1 ? '' : 's'}. This action requires verification.`
    } else if (pendingAction.type === 'payment_reminder') {
      const statusText = pendingAction.statuses.join(' and ')
      return `You are about to send payment reminders to users with ${statusText} teams. This action requires verification.`
    } else if (pendingAction.type === 'lock_reminder') {
      return `You are about to send lock deadline reminders to all verified users. This action requires verification.`
    }
    return ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Notifications & Reminders</h1>
        <p className="text-sm text-slate-400 mt-1">Send email notifications and reminders to users</p>
      </div>

      {/* Recipient Counts */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        recipientCounts && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20">
                  <Users className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-cyan-400 font-mono">
                    {recipientCounts.all}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">All Users</p>
                </div>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-amber-400 font-mono">
                    {recipientCounts.unpaid}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Unpaid Teams</p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-emerald-400 font-mono">
                    {recipientCounts.paid}
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Paid Teams</p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Quick Reminders */}
      <div className="bg-[#1e293b] border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Quick Reminders</h2>
        </div>
        <div className="p-5 space-y-5">
          {/* Payment Reminder */}
          <div className="bg-[#0f172a] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-medium text-white">Payment Reminder</h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Target teams with status:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentStatuses.draft}
                    onChange={(e) => setPaymentStatuses((prev) => ({ ...prev, draft: e.target.checked }))}
                    className="w-4 h-4 bg-[#1e293b] border border-white/20 rounded-none accent-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Draft</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentStatuses.pending}
                    onChange={(e) => setPaymentStatuses((prev) => ({ ...prev, pending: e.target.checked }))}
                    className="w-4 h-4 bg-[#1e293b] border border-white/20 rounded-none accent-cyan-500"
                  />
                  <span className="text-sm text-slate-300">Pending</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {reminderStatus?.payment ? (
                  <span>Last sent: {formatDate(reminderStatus.payment.sentAt)} ({reminderStatus.payment.recipientCount} recipients)</span>
                ) : (
                  <span>Never sent</span>
                )}
              </div>
              <button
                onClick={handlePaymentReminderClick}
                disabled={sending}
                className="px-4 py-2 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending && pendingAction?.type === 'payment_reminder' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Payment Reminder
              </button>
            </div>
          </div>

          {/* Lock Deadline Reminder */}
          <div className="bg-[#0f172a] border border-white/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-white">Lock Deadline Reminder</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Lock date:</label>
              <input
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
                className="bg-[#1e293b] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-cyan-500/50 max-w-[200px]"
              />
              <p className="text-xs text-slate-500">
                Personalized emails will be sent based on each user's team status
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                {reminderStatus?.lock_deadline ? (
                  <span>Last sent: {formatDate(reminderStatus.lock_deadline.sentAt)} ({reminderStatus.lock_deadline.recipientCount} recipients)</span>
                ) : (
                  <span>Never sent</span>
                )}
              </div>
              <button
                onClick={handleLockReminderClick}
                disabled={sending}
                className="px-4 py-2 text-sm bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending && pendingAction?.type === 'lock_reminder' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Lock Reminder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Notification Form */}
      <div className="bg-[#1e293b] border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
          <Mail className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Compose Custom Notification</h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient Type */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Recipient Type</label>
              <div className="relative">
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as 'group' | 'individual')}
                  className="appearance-none w-full bg-[#0f172a] border border-white/10 text-white text-sm pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="group">User Group</option>
                  <option value="individual">Individual User</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Recipient Selection */}
            {recipientType === 'group' ? (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Recipient Group</label>
                <div className="relative">
                  <select
                    value={recipientGroup}
                    onChange={(e) => setRecipientGroup(e.target.value as 'all' | 'unpaid' | 'paid')}
                    className="appearance-none w-full bg-[#0f172a] border border-white/10 text-white text-sm pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="all">All Users ({recipientCounts?.all || 0})</option>
                    <option value="unpaid">Users with Unpaid Teams ({recipientCounts?.unpaid || 0})</option>
                    <option value="paid">Users with Paid Teams ({recipientCounts?.paid || 0})</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">User Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full bg-[#0f172a] border border-white/10 text-white text-sm px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                maxLength={200}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm px-4 py-2.5 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-xs text-slate-500">{subject.length}/200 characters</p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email message content..."
                maxLength={10000}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm px-4 py-3 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 min-h-[200px] resize-none"
              />
              <p className="text-xs text-slate-500">{body.length}/10000 characters</p>
            </div>

            {/* Preview */}
            <div className="bg-[#0f172a] border border-white/5 p-4 space-y-2">
              <p className="text-xs text-slate-400">
                Recipients:{' '}
                <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ml-1">
                  {getRecipientCount()} user{getRecipientCount() === 1 ? '' : 's'}
                </span>
              </p>
              {recipientType === 'individual' && userEmail && (
                <p className="text-xs text-slate-400">
                  Sending to: <span className="text-white">{userEmail}</span>
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-2.5 text-sm bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {sending && pendingAction?.type === 'notification' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Re-Auth Modal */}
      <ReAuthModal
        open={showReAuth}
        onOpenChange={(open) => {
          setShowReAuth(open)
          if (!open) setPendingAction(null)
        }}
        onSuccess={handleReAuthSuccess}
        title="Confirm Action"
        description={getReAuthDescription()}
      />
    </div>
  )
}
