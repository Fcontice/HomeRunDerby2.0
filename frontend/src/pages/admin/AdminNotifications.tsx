import { useState, useEffect } from 'react'
import { adminApi, RecipientCounts } from '../../services/api'
import ReAuthModal from '../../components/admin/ReAuthModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Loader2, Send, Users, Mail, CheckCircle } from 'lucide-react'

export default function AdminNotifications() {
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [recipientType, setRecipientType] = useState<'group' | 'individual'>('group')
  const [recipientGroup, setRecipientGroup] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [userEmail, setUserEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Re-auth state
  const [showReAuth, setShowReAuth] = useState(false)

  useEffect(() => {
    loadRecipientCounts()
  }, [])

  const loadRecipientCounts = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getRecipientCounts()
      if (result.success && result.data) {
        setRecipientCounts(result.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load recipient counts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
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

    // Require re-auth before sending
    setShowReAuth(true)
  }

  const handleReAuthSuccess = async () => {
    setSending(true)
    setError('')
    setSuccess('')

    try {
      const result = await adminApi.sendNotifications({
        recipientGroup: recipientType === 'group' ? recipientGroup : undefined,
        userEmail: recipientType === 'individual' ? userEmail : undefined,
        subject,
        body,
      })

      if (result.success && result.data) {
        const { sent, failed } = result.data
        if (failed > 0) {
          setSuccess(`Sent ${sent} emails. ${failed} failed.`)
        } else {
          setSuccess(`Successfully sent ${sent} email${sent === 1 ? '' : 's'}!`)
        }
        // Clear form
        setSubject('')
        setBody('')
        setUserEmail('')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send notifications')
    } finally {
      setSending(false)
    }
  }

  const getRecipientCount = () => {
    if (!recipientCounts) return 0
    if (recipientType === 'individual') return 1
    return recipientCounts[recipientGroup] || 0
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Send Notifications</h1>
        <p className="text-slate-400">Send email notifications to users</p>
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

      {/* Notification Form */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Notification
          </CardTitle>
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
                {sending ? (
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
        onOpenChange={setShowReAuth}
        onSuccess={handleReAuthSuccess}
        title="Send Notification"
        description={`You are about to send an email to ${getRecipientCount()} user${getRecipientCount() === 1 ? '' : 's'}. This action requires verification.`}
      />
    </div>
  )
}
