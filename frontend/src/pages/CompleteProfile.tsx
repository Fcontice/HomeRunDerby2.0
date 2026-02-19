import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { usersApi } from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import { User, Phone, Check, X, Loader2, ArrowRight } from 'lucide-react'

const completeProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  phoneNumber: z
    .string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone number must be in format xxx-xxx-xxxx'),
})

type CompleteProfileFormData = z.infer<typeof completeProfileSchema>

export default function CompleteProfile() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileFormData>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      username: user?.username || '',
      phoneNumber: '',
    },
  })

  const watchedUsername = watch('username')
  const debouncedUsername = useDebounce(watchedUsername, 400)

  // Check username availability when debounced value changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameStatus('idle')
        return
      }

      // Skip check if username hasn't changed from default
      if (debouncedUsername === user?.username) {
        setUsernameStatus('available')
        return
      }

      setUsernameStatus('checking')
      try {
        const response = await usersApi.checkUsernameAvailability(debouncedUsername)
        if (response.success && response.data) {
          setUsernameStatus(response.data.available ? 'available' : 'taken')
        }
      } catch {
        setUsernameStatus('idle')
      }
    }

    checkUsername()
  }, [debouncedUsername, user?.username])

  // Auto-format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '') // Remove non-digits

    // Format as xxx-xxx-xxxx
    if (value.length > 6) {
      value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}-${value.slice(3, 6)}`
    }

    setValue('phoneNumber', value, { shouldValidate: true })
  }

  const onSubmit = async (data: CompleteProfileFormData) => {
    if (usernameStatus === 'taken') {
      setError('Please choose a different username')
      return
    }

    try {
      setError('')
      setLoading(true)

      const response = await usersApi.completeProfile({
        username: data.username,
        phoneNumber: data.phoneNumber,
      })

      if (response.success) {
        // Refresh user data in context
        await refreshUser()
        navigate('/dashboard')
      } else {
        setError(response.error?.message || 'Failed to complete profile')
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to complete profile')
    } finally {
      setLoading(false)
    }
  }

  // If user already has completed profile, redirect to dashboard
  useEffect(() => {
    if (user?.profileCompleted) {
      navigate('/dashboard')
    }
  }, [user, navigate])

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
          <div className="p-8 pb-6 text-center border-b border-white/10">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-2 h-8 bg-[#b91c1c]" />
              <span className="font-broadcast text-sm tracking-wider text-white/60">
                HOME RUN DERBY 2.0
              </span>
              <div className="w-2 h-8 bg-[#b91c1c]" />
            </div>
            <h1 className="font-broadcast text-4xl text-white tracking-wide">
              COMPLETE PROFILE
            </h1>
            <p className="text-white/50 mt-2">
              Just a few more details to get started
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
              {/* Username field */}
              <div>
                <label htmlFor="username" className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/5 border-r border-white/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    {...register('username')}
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-14 pr-12 py-3 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                  />
                  {/* Username availability indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    {usernameStatus === 'taken' && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-red-400 text-xs mt-1">Username is already taken</p>
                )}
                {usernameStatus === 'available' && watchedUsername !== user?.username && (
                  <p className="text-green-400 text-xs mt-1">Username is available</p>
                )}
              </div>

              {/* Phone number field */}
              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                  Phone Number <span className="text-[#d97706]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-white/5 border-r border-white/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="xxx-xxx-xxxx"
                    {...register('phoneNumber')}
                    onChange={handlePhoneChange}
                    disabled={loading}
                    maxLength={12}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 pl-14 pr-4 py-3 rounded-none focus:outline-none focus:border-[#b91c1c] transition-colors disabled:opacity-50"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-red-400 text-xs mt-1">{errors.phoneNumber.message}</p>
                )}
                <p className="text-white/40 text-xs mt-1">
                  US format required (xxx-xxx-xxxx)
                </p>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || usernameStatus === 'taken' || usernameStatus === 'checking'}
                className="w-full bg-[#b91c1c] hover:bg-[#991b1b] text-white font-broadcast text-lg tracking-wider py-3 rounded-none transition-colors disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <span>GET STARTED</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer info */}
          <div className="p-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm">
              Your phone number is required for account recovery and important notifications.
            </p>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-gradient-to-r from-[#b91c1c] via-[#d97706] to-[#b91c1c]" />
      </div>
    </div>
  )
}
