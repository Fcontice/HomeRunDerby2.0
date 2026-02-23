import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { authApi } from '../services/api'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setStatus('error')
        setMessage('No verification token provided')
        return
      }

      try {
        const response = await authApi.verifyEmail(token)
        if (response.success) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')
        } else {
          setStatus('error')
          setMessage(response.error?.message || 'Verification failed')
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(
          err.response?.data?.error?.message ||
            'Invalid or expired verification token'
        )
      }
    }

    verifyToken()
  }, [searchParams])

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 50px,
            rgba(255,255,255,0.03) 50px,
            rgba(255,255,255,0.03) 51px
          )`
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-brand-red via-accent-amber to-brand-red" />

        {/* Card */}
        <div className="bg-surface-card border border-border">
          {/* Header */}
          <div className="p-8 text-center border-b border-border">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-2 h-8 bg-brand-red" />
              <span className="font-broadcast text-sm tracking-wider text-white/60">
                HOME RUN DERBY 2.0
              </span>
              <div className="w-2 h-8 bg-brand-red" />
            </div>
            <h1 className="font-broadcast text-3xl text-white tracking-wide">
              {status === 'loading' && 'VERIFYING EMAIL'}
              {status === 'success' && 'EMAIL VERIFIED'}
              {status === 'error' && 'VERIFICATION FAILED'}
            </h1>
            {status === 'loading' && (
              <p className="text-white/50 mt-2">
                Please wait while we verify your email
              </p>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {status === 'loading' && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="text-white/50 mt-4">Verifying your email address...</p>
              </div>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 mx-auto mb-6 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/30 mb-6">
                  <p className="text-green-400 text-sm text-center">{message}</p>
                </div>
                <Link
                  to="/login"
                  className="block w-full bg-brand-red hover:bg-brand-red-dark text-white font-broadcast text-lg tracking-wider py-3 rounded-none transition-colors text-center"
                >
                  GO TO LOGIN
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 mx-auto mb-6 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/30 mb-6">
                  <p className="text-red-400 text-sm text-center">{message}</p>
                </div>
                <Link
                  to="/login"
                  className="block w-full bg-white/5 hover:bg-white/10 border border-border text-white font-broadcast text-lg tracking-wider py-3 rounded-none transition-colors text-center"
                >
                  BACK TO LOGIN
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-brand-red via-accent-amber to-brand-red" />
      </div>
    </div>
  )
}
