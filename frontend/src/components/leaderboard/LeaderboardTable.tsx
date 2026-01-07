import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { LeaderboardEntry } from '../../services/api'
import { LeaderboardRow } from './LeaderboardRow'
import { Button } from '../ui/button'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  type: 'overall' | 'monthly'
  isLoading: boolean
  onRefresh: () => void
}

export function LeaderboardTable({ entries, type, isLoading, onRefresh }: LeaderboardTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

  const handleToggle = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No teams have entered the contest yet.</p>
        <p className="text-sm mt-2">Be the first to create a team!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <div className="w-5" /> {/* Spacer for chevron */}
          <div className="w-12 text-center text-xs font-medium text-gray-500 uppercase">Rank</div>
          <div className="flex-1 text-xs font-medium text-gray-500 uppercase">Team</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-32 text-xs font-medium text-gray-500 uppercase hidden sm:block">Owner</div>
          {type === 'overall' ? (
            <div className="flex gap-4 text-xs font-medium text-gray-500 uppercase">
              <div className="w-16 text-right hidden md:block">Regular</div>
              <div className="w-16 text-right hidden md:block">Post</div>
              <div className="w-20 text-right">Total</div>
            </div>
          ) : (
            <div className="w-20 text-right text-xs font-medium text-gray-500 uppercase">HRs</div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="ml-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Rows */}
      <div>
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.teamId}
            entry={entry}
            isExpanded={expandedTeamId === entry.teamId}
            onToggle={() => handleToggle(entry.teamId)}
            showBreakdown={type === 'overall'}
          />
        ))}
      </div>
    </div>
  )
}
