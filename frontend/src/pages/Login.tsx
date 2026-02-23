import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'
import { Mail, Lock, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      setLoading(true)
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    authApi.googleLogin()
  }

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
          <div className="p-8 pb-6 text-center border-b border-border">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-2 h-8 bg-brand-red" />
              <span className="font-broadcast text-sm tracking-wider text-white/60">
                HOME RUN DERBY 2.0
              </span>
              <div className="w-2 h-8 bg-brand-red" />
            </div>
            <h1 className="font-broadcast text-4xl text-white tracking-wide">
              SIGN IN
            </h1>
            <p className="text-white/50 mt-2">
              &#129506; Access your teams and compete
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/5 border-r border-border flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    disabled={loading}
                    className="w-full bg-white/5 border border-border text-white placeholder-white/30 pl-14 pr-4 py-3 focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-medium text-white/60 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-accent-amber hover:text-accent-amber/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/5 border-r border-border flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                    className="w-full bg-white/5 border border-border text-white placeholder-white/30 pl-14 pr-4 py-3 focus:outline-none focus:border-brand-red transition-colors disabled:opacity-50"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-red hover:bg-brand-red-dark text-white font-broadcast text-lg tracking-wider py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <span>SIGNING IN...</span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-surface-card text-white/40 text-xs uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white/5 hover:bg-white/10 border border-border text-white py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border text-center">
            <p className="text-white/50 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-amber hover:text-accent-amber/80 font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-brand-red via-accent-amber to-brand-red" />
      </div>
    </div>
  )
}
