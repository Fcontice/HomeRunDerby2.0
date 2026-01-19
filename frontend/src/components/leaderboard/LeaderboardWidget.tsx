import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, ChevronRight, Trophy } from 'lucide-react'
import { leaderboardsApi, LeaderboardEntry } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'

interface LeaderboardWidgetProps {
  userTeamIds?: string[]
}

export function LeaderboardWidget({ userTeamIds = [] }: LeaderboardWidgetProps) {
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await leaderboardsApi.getOverall()
      if (response.success && response.data) {
        setTopEntries(response.data.leaderboard.slice(0, 5))

        if (userTeamIds.length > 0) {
          const userInTop5 = response.data.leaderboard
            .slice(0, 5)
            .find((e) => userTeamIds.includes(e.teamId))

          if (!userInTop5) {
            const userTeam = response.data.leaderboard.find((e) => userTeamIds.includes(e.teamId))
            setUserEntry(userTeam || null)
          } else {
            setUserEntry(null)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userTeamIds.join(',')])

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-badge'
    if (rank === 2) return 'rank-badge rank-badge-silver'
    if (rank === 3) return 'rank-badge rank-badge-bronze'
    return 'inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-sm font-medium bg-slate-800 text-slate-300'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <CardTitle>Leaderboard</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 bg-slate-800 rounded-full" />
                  <div className="h-4 w-28 bg-slate-800 rounded" />
                </div>
                <div className="h-4 w-12 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : topEntries.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="The race starts soon"
            description="Be the first to claim the top spot!"
            className="py-8"
          />
        ) : (
          <div className="space-y-1">
            {topEntries.map((entry, index) => (
              <div
                key={entry.teamId}
                className={`flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-slate-800/50 animate-fade-up stagger-${index + 1}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <span className={getRankBadgeClass(entry.rank)}>{entry.rank}</span>
                  <span className="truncate font-medium text-foreground">{entry.teamName}</span>
                </div>
                <span className="stat-gold font-semibold whitespace-nowrap">
                  {entry.totalHrs}
                </span>
              </div>
            ))}

            {userEntry && (
              <>
                <div className="border-t border-dashed border-slate-700 my-3" />
                <div className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3 truncate">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-sm font-medium bg-primary/20 text-primary">
                      {userEntry.rank}
                    </span>
                    <span className="truncate font-medium text-foreground">{userEntry.teamName}</span>
                    <span className="text-xs text-muted-foreground">(You)</span>
                  </div>
                  <span className="stat-gold font-semibold whitespace-nowrap">
                    {userEntry.totalHrs}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Link
          to="/leaderboard"
          className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 font-medium mt-4 pt-4 border-t border-slate-800 transition-colors"
        >
          View Full Leaderboard
          <ChevronRight size={16} />
        </Link>
      </CardContent>
    </Card>
  )
}
