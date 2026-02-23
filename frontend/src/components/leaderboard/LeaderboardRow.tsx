import { forwardRef, memo, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { LeaderboardEntry } from '../../services/api'
import { TeamDetails } from './TeamDetails'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  index: number
  isExpanded: boolean
  onToggle: () => void
  isHighlighted?: boolean
  isCurrentUser?: boolean
}

export const LeaderboardRow = memo(forwardRef<HTMLDivElement, LeaderboardRowProps>(
  function LeaderboardRow({ entry, index, isExpanded, onToggle, isHighlighted, isCurrentUser }, ref) {
  // Memoize rank display to prevent recalculation on every render
  const rankDisplay = useMemo(() => {
    const rank = entry.rank
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-accent-amber flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">1</span>
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">3</span>
        </div>
      )
    }
    return (
      <div className="w-8 h-8 bg-white/5 flex items-center justify-center">
        <span className="font-broadcast text-sm text-muted-foreground">{rank}</span>
      </div>
    )
  }, [entry.rank])

  const isEven = index % 2 === 0
  const highlighted = isHighlighted || isCurrentUser

  return (
    <div
      ref={ref}
      className={`border-b border-border ${isEven ? 'bg-surface-deep/50' : ''} ${
        highlighted ? 'ring-2 ring-brand-red bg-brand-red/10' : ''
      }`}
    >
      <div
        onClick={onToggle}
        className="flex items-center p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        {/* Expand Icon */}
        <div className="w-5 text-muted-foreground">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>

        {/* Rank */}
        <div className="w-12 flex justify-center">{rankDisplay}</div>

        {/* Team Name */}
        <div className="flex-1 min-w-0 px-2">
          <p className="font-medium text-white truncate">{entry.teamName}</p>
        </div>

        {/* Owner */}
        <div className="w-32 hidden sm:flex items-center gap-2">
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={entry.username}
              className="w-6 h-6"
            />
          ) : (
            <div className="w-6 h-6 bg-white/10" />
          )}
          <span className="text-sm text-muted-foreground truncate">
            @{entry.username}
          </span>
        </div>

        {/* Total HRs */}
        <div className="w-20 text-right">
          <p className="font-broadcast text-2xl text-accent-amber broadcast-stat">{entry.totalHrs}</p>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">
            <span className="opacity-50 mr-0.5">&#9918;</span>HRs
          </p>
        </div>

        {/* Spacer for refresh button alignment */}
        <div className="w-10" />
      </div>

      {/* Expanded Content */}
      {isExpanded && entry.playerScores && (
        <TeamDetails playerScores={entry.playerScores} />
      )}
    </div>
  )
}))
