import { useSeason } from '../contexts/SeasonContext'
import { SeasonPhase } from '../services/api'
import { AlertCircle, Calendar, CheckCircle, Clock } from 'lucide-react'

interface BannerConfig {
  message: string
  variant: 'info' | 'success' | 'warning' | 'neutral'
  icon: React.ReactNode
  show: boolean
}

function getBannerConfig(
  phase: SeasonPhase | undefined,
  registrationCloseDate: string | null,
  seasonYear: number | undefined
): BannerConfig {
  const year = seasonYear || new Date().getFullYear()

  switch (phase) {
    case 'off_season':
      return {
        message: `Season ${year} registration opens soon! Check back for updates.`,
        variant: 'info',
        icon: <Clock className="h-4 w-4" />,
        show: true,
      }
    case 'registration':
      const closeDate = registrationCloseDate
        ? new Date(registrationCloseDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          })
        : 'soon'
      return {
        message: `Registration is open! Create your team before ${closeDate}.`,
        variant: 'success',
        icon: <Calendar className="h-4 w-4" />,
        show: true,
      }
    case 'active':
      return {
        message: `Season ${year} is live! Follow the leaderboard for updates.`,
        variant: 'neutral',
        icon: <CheckCircle className="h-4 w-4" />,
        show: false, // Hide during active season to reduce noise
      }
    case 'completed':
      return {
        message: `Season ${year} has ended. Congratulations to all winners! Stay tuned for ${year + 1}.`,
        variant: 'info',
        icon: <AlertCircle className="h-4 w-4" />,
        show: true,
      }
    default:
      return {
        message: '',
        variant: 'neutral',
        icon: null,
        show: false,
      }
  }
}

const variantStyles = {
  info: 'bg-blue-950/50 border-blue-900/50 text-blue-300',
  success: 'bg-emerald-950/50 border-emerald-900/50 text-emerald-300',
  warning: 'bg-amber-950/50 border-amber-900/50 text-amber-300',
  neutral: 'bg-slate-900/50 border-slate-800/50 text-slate-300',
}

export function SeasonBanner() {
  const { season, loading } = useSeason()

  if (loading) {
    return null
  }

  const config = getBannerConfig(
    season?.phase,
    season?.registrationCloseDate || null,
    season?.seasonYear
  )

  if (!config.show) {
    return null
  }

  return (
    <div
      className={`border-b px-4 py-2 ${variantStyles[config.variant]}`}
      role="banner"
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        {config.icon}
        <span>{config.message}</span>
      </div>
    </div>
  )
}
