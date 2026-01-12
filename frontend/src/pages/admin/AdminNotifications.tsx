import { useState, useEffect } from 'react'
import { adminApi, RecipientCounts, ReminderStatus } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Loader2, Send, Users, Mail, CheckCircle, Bell, Calendar, CreditCard, Clock } from 'lucide-react'

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
          // Reload reminder status
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
          // Reload reminder status
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
      <div>
        <h1 className="text-3xl font-bold text-white">Notifications & Reminders</h1>
        <p className="text-slate-400">Send email notifications and reminders to users</p>
      </div>

      {/* Recipient Counts */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        recipientCounts && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {recipientCounts.all}
                    </p>
                    <p className="text-sm text-slate-400">All Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {recipientCounts.unpaid}
                    </p>
                    <p className="text-sm text-slate-400">Unpaid Teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {recipientCounts.paid}
                    </p>
                    <p className="text-sm text-slate-400">Paid Teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Quick Reminders */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Quick Reminders
          </CardTitle>
          <CardDescription>
            Send pre-configured reminder emails to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Reminder */}
          <div className="border border-slate-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-yellow-400" />
              <h3 className="font-semibold text-white">Payment Reminder</h3>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Target teams with status:</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="draft"
                    checked={paymentStatuses.draft}
                    onCheckedChange={(checked) =>
                      setPaymentStatuses((prev) => ({ ...prev, draft: checked === true }))
                    }
                  />
                  <Label htmlFor="draft" className="text-sm text-slate-300 cursor-pointer">
                    Draft
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pending"
                    checked={paymentStatuses.pending}
                    onCheckedChange={(checked) =>
                      setPaymentStatuses((prev) => ({ ...prev, pending: checked === true }))
                    }
                  />
                  <Label htmlFor="pending" className="text-sm text-slate-300 cursor-pointer">
                    Pending
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                {reminderStatus?.payment ? (
                  <span>
                    Last sent: {formatDate(reminderStatus.payment.sentAt)} ({reminderStatus.payment.recipientCount} recipients)
                  </span>
                ) : (
                  <span>Never sent</span>
                )}
              </div>
              <Button
                onClick={handlePaymentReminderClick}
                disabled={sending}
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                {sending && pendingAction?.type === 'payment_reminder' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Payment Reminder
              </Button>
            </div>
          </div>

          {/* Lock Deadline Reminder */}
          <div className="border border-slate-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Lock Deadline Reminder</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockDate" className="text-slate-300">Lock date:</Label>
              <Input
                id="lockDate"
                type="date"
                value={lockDate}
                onChange={(e) => setLockDate(e.target.value)}
                className="max-w-[200px]"
              />
              <p className="text-xs text-slate-500">
                Personalized emails will be sent based on each user's team status
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                {reminderStatus?.lock_deadline ? (
                  <span>
                    Last sent: {formatDate(reminderStatus.lock_deadline.sentAt)} ({reminderStatus.lock_deadline.recipientCount} recipients)
                  </span>
                ) : (
                  <span>Never sent</span>
                )}
              </div>
              <Button
                onClick={handleLockReminderClick}
                disabled={sending}
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
              >
                {sending && pendingAction?.type === 'lock_reminder' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Lock Reminder
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Notification Form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Custom Notification
          </CardTitle>
          <CardDescription>
            Send a custom email to specific users or groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Type */}
            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select
                value={recipientType}
                onValueChange={(v) => setRecipientType(v as 'group' | 'individual')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">User Group</SelectItem>
                  <SelectItem value="individual">Individual User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Selection */}
            {recipientType === 'group' ? (
              <div className="space-y-2">
                <Label>Recipient Group</Label>
                <Select
                  value={recipientGroup}
                  onValueChange={(v) => setRecipientGroup(v as 'all' | 'unpaid' | 'paid')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Users ({recipientCounts?.all || 0})
                    </SelectItem>
                    <SelectItem value="unpaid">
                      Users with Unpaid Teams ({recipientCounts?.unpaid || 0})
                    </SelectItem>
                    <SelectItem value="paid">
                      Users with Paid Teams ({recipientCounts?.paid || 0})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="userEmail">User Email</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                maxLength={200}
              />
              <p className="text-xs text-slate-500">{subject.length}/200 characters</p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email message content..."
                className="min-h-[200px]"
                maxLength={10000}
              />
              <p className="text-xs text-slate-500">{body.length}/10000 characters</p>
            </div>

            {/* Preview */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-400">
                Recipients:{' '}
                <Badge variant="outline" className="ml-1">
                  {getRecipientCount()} user{getRecipientCount() === 1 ? '' : 's'}
                </Badge>
              </p>
              {recipientType === 'individual' && userEmail && (
                <p className="text-sm text-slate-400">
                  Sending to: <span className="text-white">{userEmail}</span>
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit" disabled={sending} className="min-w-[150px]">
                {sending && pendingAction?.type === 'notification' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
