import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { LeaderboardEntry } from '../../services/api'
import { LeaderboardRow } from './LeaderboardRow'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  type: 'overall' | 'monthly'
  isLoading: boolean
  onRefresh: () => void
  highlightTeamId?: string | null
  currentUserId?: string
}

export function LeaderboardTable({ entries, type: _type, isLoading, onRefresh, highlightTeamId, currentUserId }: LeaderboardTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Auto-expand and scroll to highlighted team
  useEffect(() => {
    if (highlightTeamId && entries.length > 0) {
      setExpandedTeamId(highlightTeamId)

      // Smooth scroll to team after a short delay
      setTimeout(() => {
        const element = rowRefs.current.get(highlightTeamId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }, [highlightTeamId, entries])

  const setRowRef = (teamId: string, element: HTMLDivElement | null) => {
    if (element) {
      rowRefs.current.set(teamId, element)
    } else {
      rowRefs.current.delete(teamId)
    }
  }

  const handleToggle = (teamId: string) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
            <div className="w-12 h-6 bg-white/5" />
            <div className="flex-1 h-6 bg-white/5" />
            <div className="w-20 h-6 bg-white/5" />
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">No teams have entered the contest yet.</p>
        <p className="text-sm mt-2 text-muted-foreground">Be the first to create a team!</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-surface-deep border-b border-border">
        <div className="w-5" /> {/* Spacer for chevron */}
        <div className="w-12 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">Rank</div>
        <div className="flex-1 text-sm font-medium text-muted-foreground uppercase tracking-wider pl-4">Team</div>
        <div className="w-32 text-sm font-medium text-muted-foreground uppercase tracking-wider hidden sm:block">Owner</div>
        <div className="w-20 text-right text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="ml-2 p-2 text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Rows */}
      <div>
        {entries.map((entry, index) => (
          <LeaderboardRow
            key={entry.teamId}
            ref={(el) => setRowRef(entry.teamId, el)}
            entry={entry}
            index={index}
            isExpanded={expandedTeamId === entry.teamId}
            onToggle={() => handleToggle(entry.teamId)}
            isHighlighted={highlightTeamId === entry.teamId}
            isCurrentUser={currentUserId === entry.userId}
          />
        ))}
      </div>
    </div>
  )
}
