import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * If true (default), redirects users with incomplete profiles to /complete-profile
   * Set to false for the complete-profile page itself
   */
  requireCompletedProfile?: boolean
}

export default function ProtectedRoute({
  children,
  requireCompletedProfile = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check if user needs to complete profile
  // Only redirect if requireCompletedProfile is true and we're not already on complete-profile
  if (
    requireCompletedProfile &&
    user.profileCompleted === false &&
    location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />
  }

  return <>{children}</>
}
