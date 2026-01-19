import * as React from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'gold'
  }
  className?: string
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-up',
        className
      )}
    >
      {icon && (
        <div className="text-4xl mb-4 opacity-80">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'default'}
          className="min-w-[160px]"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
