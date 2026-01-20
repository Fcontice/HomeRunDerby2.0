import { forwardRef } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { LeaderboardEntry } from '../../services/api'
import { TeamDetails } from './TeamDetails'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  index: number
  isExpanded: boolean
  onToggle: () => void
  isHighlighted?: boolean
}

export const LeaderboardRow = forwardRef<HTMLDivElement, LeaderboardRowProps>(
  function LeaderboardRow({ entry, index, isExpanded, onToggle, isHighlighted }, ref) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 bg-[#d97706] flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">1</span>
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">3</span>
        </div>
      )
    }
    return (
      <div className="w-8 h-8 bg-white/5 flex items-center justify-center">
        <span className="font-broadcast text-sm text-gray-400">{rank}</span>
      </div>
    )
  }

  const isEven = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`border-b border-white/5 ${isEven ? 'bg-[#0c0c0c]/50' : ''} ${
        isHighlighted ? 'ring-2 ring-[#b91c1c] bg-[#b91c1c]/10' : ''
      }`}
    >
      <div
        onClick={onToggle}
        className="flex items-center p-4 cursor-pointer hover:bg-white/5 transition-colors"
      >
        {/* Expand Icon */}
        <div className="w-5 text-gray-600">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>

        {/* Rank */}
        <div className="w-12 flex justify-center">{getRankDisplay(entry.rank)}</div>

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
          <span className="text-sm text-gray-500 truncate">
            @{entry.username}
          </span>
        </div>

        {/* Total HRs */}
        <div className="w-20 text-right">
          <p className="font-broadcast text-2xl text-[#d97706]">{entry.totalHrs}</p>
          <p className="text-xs text-gray-600 uppercase tracking-wider">HRs</p>
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
})
