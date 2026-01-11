import { Card, CardContent } from '../ui/card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'warning' | 'success' | 'danger'
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'default',
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-slate-800 border-slate-700',
    warning: 'bg-yellow-900/20 border-yellow-700/50',
    success: 'bg-green-900/20 border-green-700/50',
    danger: 'bg-red-900/20 border-red-700/50',
  }

  const iconStyles = {
    default: 'text-slate-400',
    warning: 'text-yellow-400',
    success: 'text-green-400',
    danger: 'text-red-400',
  }

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {description && (
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-slate-700/50`}>
            <Icon className={`h-6 w-6 ${iconStyles[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
