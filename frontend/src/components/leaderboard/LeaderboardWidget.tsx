import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, ChevronRight } from 'lucide-react'
import { leaderboardsApi, LeaderboardEntry } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

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
      // Fetch top entries
      const response = await leaderboardsApi.getOverall()
      if (response.success && response.data) {
        setTopEntries(response.data.leaderboard.slice(0, 5))

        // Check if user's team is in top 5
        if (userTeamIds.length > 0) {
          const userInTop5 = response.data.leaderboard
            .slice(0, 5)
            .find((e) => userTeamIds.includes(e.teamId))

          if (!userInTop5) {
            // Find user's best team position
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

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd'
    if (rank === 3) return '3rd'
    return `${rank}.`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Leaderboard</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : topEntries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No teams yet. Be the first!
          </p>
        ) : (
          <div className="space-y-1">
            {topEntries.map((entry) => (
              <div
                key={entry.teamId}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-6">{getRankDisplay(entry.rank)}</span>
                  <span className="truncate font-medium">{entry.teamName}</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {entry.totalHrs} HRs
                </span>
              </div>
            ))}

            {userEntry && (
              <>
                <div className="border-t border-dashed border-gray-300 dark:border-gray-600 my-2" />
                <div className="flex items-center justify-between py-1.5 text-sm bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 rounded">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-6 font-medium">{userEntry.rank}.</span>
                    <span className="truncate font-medium">{userEntry.teamName}</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {userEntry.totalHrs} HRs
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Link
          to="/leaderboard"
          className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 mt-4 pt-3 border-t"
        >
          View Full Leaderboard
          <ChevronRight size={16} />
        </Link>
      </CardContent>
    </Card>
  )
}
