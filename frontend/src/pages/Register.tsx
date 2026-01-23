import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function Register() {
  const { register: registerAuth } = useAuth()
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('')
      setSuccess(false)
      setLoading(true)
      await registerAuth(data.email, data.username, data.password, data.phoneNumber)
      setSuccess(true)
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || err.message || 'Registration failed'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    authApi.googleLogin()
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4">
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
          <div className="h-1 bg-gradient-to-r from-[#b91c1c] via-[#d97706] to-[#b91c1c]" />

          {/* Card */}
          <div className="bg-[#18181b] border border-white/10">
            {/* Header */}
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 mx-auto mb-6 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h1 className="font-broadcast text-3xl text-white tracking-wide mb-2">
                CHECK YOUR EMAIL
              </h1>
              <p className="text-white/50">
                Registration successful!
              </p>
            </div>

            {/* Content */}
            <div className="px-8 pb-8">
              <div className="p-4 bg-green-500/10 border border-green-500/30 mb-6">
                <p className="text-green-400 text-sm">
                  We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                </p>
              </div>

              <Link
                to="/login"
                className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-broadcast text-lg tracking-wider py-3 rounded-none transition-colors text-center"
              >
                GO TO LOGIN
              </Link>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="h-1 bg-gradient-to-r from-[#b91c1c] via-[#d97706] to-[#b91c1c]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4">
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

      <div className="relative w-full max-w-3xl">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#b91c1c] via-[#d97706] to-[#b91c1c]" />

        {/* Card */}
        <div className="bg-[#18181b] border border-white/10">
          {/* Header */}
          <div className="p-6 text-center border-b border-white/10">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-2 h-6 bg-[#b91c1c]" />
              <span className="font-broadcast text-sm tracking-wider text-white/60">
                HOME RUN DERBY 2.0
              </span>
              <div className="w-2 h-6 bg-[#b91c1c]" />
            </div>
            <h1 className="font-broadcast text-3xl text-white tracking-wide">
              CREATE ACCOUNT
            </h1>
            <p className="text-white/50 mt-1 text-sm">
              Join the competition today
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Two-column grid for form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email field */}
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/5 border-r border-white/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      {...register('email')}
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-12 pr-4 py-2.5 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone field */}
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/5 border-r border-white/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...register('phoneNumber')}
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-12 pr-4 py-2.5 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="text-red-400 text-xs mt-1">{errors.phoneNumber.message}</p>
                  )}
                </div>

                {/* Username field */}
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/5 border-r border-white/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      type="text"
                      placeholder="johndoe"
                      {...register('username')}
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-12 pr-4 py-2.5 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                  )}
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/5 border-r border-white/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('password')}
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-12 pr-4 py-2.5 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
                  )}
                  <p className="text-white/30 text-xs mt-1">
                    Min 8 chars: uppercase, lowercase, number
                  </p>
                </div>

                {/* Confirm Password field - full width */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative md:max-w-[calc(50%-0.5rem)]">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-white/5 border-r border-white/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-12 pr-4 py-2.5 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Bottom section: buttons side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white font-broadcast text-base tracking-wider py-2.5 rounded-none transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <span>CREATING ACCOUNT...</span>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Google button */}
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2.5 rounded-none transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
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
                  <span>Continue with Google</span>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#d97706] hover:text-[#f59e0b] font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-[#b91c1c] via-[#d97706] to-[#b91c1c]" />
      </div>
    </div>
  )
}
