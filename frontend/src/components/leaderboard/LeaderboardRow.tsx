import { ChevronDown, ChevronRight } from 'lucide-react'
import { LeaderboardEntry } from '../../services/api'
import { TeamDetails } from './TeamDetails'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isExpanded: boolean
  onToggle: () => void
  showBreakdown: boolean
}

export function LeaderboardRow({ entry, isExpanded, onToggle, showBreakdown }: LeaderboardRowProps) {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>
    if (rank === 2) return <span className="text-xl">🥈</span>
    if (rank === 3) return <span className="text-xl">🥉</span>
    return <span className="text-gray-600 dark:text-gray-400 font-medium">{rank}</span>
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div
        onClick={onToggle}
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {/* Expand Icon */}
        <div className="w-5 text-gray-400">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>

        {/* Rank */}
        <div className="w-12 text-center">{getRankDisplay(entry.rank)}</div>

        {/* Team Name */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{entry.teamName}</p>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-2 w-32 hidden sm:flex">
          {entry.avatarUrl ? (
            <img
              src={entry.avatarUrl}
              alt={entry.username}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            @{entry.username}
          </span>
        </div>

        {/* HR Stats */}
        {showBreakdown && entry.regularSeasonHrs !== undefined ? (
          <div className="flex items-center gap-4 text-right">
            <div className="w-16 hidden md:block">
              <p className="text-xs text-gray-500">Regular</p>
              <p className="font-medium">{entry.regularSeasonHrs}</p>
            </div>
            <div className="w-16 hidden md:block">
              <p className="text-xs text-gray-500">Post</p>
              <p className="font-medium">{entry.postseasonHrs || 0}</p>
            </div>
            <div className="w-20">
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-bold text-lg">{entry.totalHrs}</p>
            </div>
          </div>
        ) : (
          <div className="w-20 text-right">
            <p className="font-bold text-lg">{entry.totalHrs}</p>
            <p className="text-xs text-gray-500">HRs</p>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && entry.playerScores && (
        <TeamDetails playerScores={entry.playerScores} />
      )}
    </div>
  )
}
