import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { adminApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ReAuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  title?: string
  description?: string
}

export default function ReAuthModal({
  open,
  onOpenChange,
  onSuccess,
  title = 'Confirm Your Identity',
  description = 'This action requires verification.',
}: ReAuthModalProps) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isOAuthUser = user?.authProvider === 'google'

  // Auto-verify OAuth users when modal opens
  useEffect(() => {
    if (open && isOAuthUser) {
      handleOAuthVerify()
    }
  }, [open, isOAuthUser])

  const handleOAuthVerify = async () => {
    setLoading(true)
    try {
      const result = await adminApi.verifyPassword('')
      if (result.success) {
        onSuccess()
        onOpenChange(false)
      } else {
        setError(result.error?.message || 'Verification failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await adminApi.verifyPassword(password)
      if (result.success) {
        setPassword('')
        onSuccess()
        onOpenChange(false)
      } else {
        setError(result.error?.message || 'Verification failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setPassword('')
      setError('')
    }
    onOpenChange(open)
  }

  // OAuth users see a simple confirmation dialog
  if (isOAuthUser) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-400">Verifying...</span>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <p className="text-sm text-red-500">{error}</p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => handleClose(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleOAuthVerify}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Email/password users enter their password
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !password}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
