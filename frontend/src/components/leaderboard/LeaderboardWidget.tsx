import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronRight, Trophy, Calendar } from 'lucide-react'
import { leaderboardsApi, LeaderboardEntry } from '../../services/api'

type LeaderboardType = 'overall' | 'monthly'

const MONTHS = [
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
]

interface LeaderboardWidgetProps {
  userTeamIds?: string[]
  type?: LeaderboardType
  month?: number
}

export function LeaderboardWidget({ userTeamIds = [], type = 'overall', month }: LeaderboardWidgetProps) {
  const navigate = useNavigate()
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [userEntries, setUserEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (month) return month
    const currentMonth = new Date().getMonth() + 1
    return currentMonth >= 3 && currentMonth <= 9 ? currentMonth : 3
  })

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = type === 'overall'
        ? await leaderboardsApi.getOverall()
        : await leaderboardsApi.getMonthly(selectedMonth)
      if (response.success && response.data) {
        setTopEntries(response.data.leaderboard.slice(0, 5))

        if (userTeamIds.length > 0) {
          // Find all user teams that are NOT in the top 5
          const top5Ids = response.data.leaderboard.slice(0, 5).map(e => e.teamId)
          const userTeamsNotInTop5 = response.data.leaderboard.filter(
            (e) => userTeamIds.includes(e.teamId) && !top5Ids.includes(e.teamId)
          )
          setUserEntries(userTeamsNotInTop5)
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamClick = (teamId: string) => {
    const params = new URLSearchParams({ teamId })
    if (type === 'monthly') {
      params.set('tab', 'monthly')
      params.set('month', String(selectedMonth))
    }
    navigate(`/leaderboard?${params.toString()}`)
  }

  // Memoize the team IDs key to prevent unnecessary re-fetches
  const userTeamIdsKey = useMemo(() => userTeamIds.join(','), [userTeamIds])

  useEffect(() => {
    fetchData()
  }, [userTeamIdsKey, type, selectedMonth])

  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 bg-accent-amber flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">1</span>
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 bg-gray-400 flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 bg-amber-700 flex items-center justify-center">
          <span className="font-broadcast text-sm text-surface-base">3</span>
        </div>
      )
    }
    return (
      <div className="w-7 h-7 bg-white/5 flex items-center justify-center">
        <span className="font-broadcast text-sm text-muted-foreground">{rank}</span>
      </div>
    )
  }

  return (
    <div className="card-data-table">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'overall' ? (
            <Trophy className="h-5 w-5 text-accent-amber" />
          ) : (
            <Calendar className="h-5 w-5 text-accent-blue" />
          )}
          <h2 className="font-broadcast text-xl text-white">
            {type === 'overall' ? 'OVERALL' : 'MONTHLY'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {type === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-2 py-1 border border-border bg-surface-deep text-sm text-white focus:outline-none focus:border-brand-red"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 bg-white/5" />
                  <div className="h-4 w-28 bg-white/5" />
                </div>
                <div className="h-4 w-12 bg-white/5" />
              </div>
            ))}
          </div>
        ) : topEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 bg-white/5 flex items-center justify-center">
              <span className="text-2xl">&#9918;</span>
            </div>
            <h3 className="font-broadcast text-lg text-white mb-1">THE RACE STARTS SOON</h3>
            <p className="text-sm text-muted-foreground">&#129351; Be the first to claim the top spot!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topEntries.map((entry, i) => {
              const isUserTeam = userTeamIds.includes(entry.teamId)
              return (
                <div
                  key={entry.teamId}
                  onClick={isUserTeam ? () => handleTeamClick(entry.teamId) : undefined}
                  className={`flex items-center justify-between py-2 px-2 -mx-2 transition-colors opacity-0 animate-fade-up ${
                    isUserTeam
                      ? 'bg-brand-red/10 border border-brand-red/30 cursor-pointer hover:bg-brand-red/20'
                      : 'hover:bg-white/5'
                  }`}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center gap-3 truncate">
                    {getRankDisplay(entry.rank)}
                    <span className="truncate font-medium text-white">{entry.teamName}</span>
                    {isUserTeam && <span className="text-xs text-muted-foreground">(You)</span>}
                  </div>
                  <span className="font-broadcast text-lg text-accent-amber whitespace-nowrap">
                    {entry.totalHrs}
                  </span>
                </div>
              )
            })}

            {userEntries.length > 0 && (
              <>
                <div className="border-t border-dashed border-border my-3" />
                {userEntries.map((entry) => (
                  <div
                    key={entry.teamId}
                    onClick={() => handleTeamClick(entry.teamId)}
                    className="flex items-center justify-between py-2 px-2 -mx-2 bg-brand-red/10 border border-brand-red/30 cursor-pointer hover:bg-brand-red/20 transition-colors mb-1"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-7 h-7 bg-brand-red flex items-center justify-center">
                        <span className="font-broadcast text-sm text-white">{entry.rank}</span>
                      </div>
                      <span className="truncate font-medium text-white">{entry.teamName}</span>
                      <span className="text-xs text-muted-foreground">(You)</span>
                    </div>
                    <span className="font-broadcast text-lg text-accent-amber whitespace-nowrap">
                      {entry.totalHrs}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <Link
        to={type === 'monthly' ? `/leaderboard?tab=monthly&month=${selectedMonth}` : '/leaderboard'}
        className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-white font-medium py-4 border-t border-border transition-colors"
      >
        View Full Leaderboard
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
