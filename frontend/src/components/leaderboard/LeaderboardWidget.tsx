import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronRight, Trophy } from 'lucide-react'
import { leaderboardsApi, LeaderboardEntry } from '../../services/api'

interface LeaderboardWidgetProps {
  userTeamIds?: string[]
}

export function LeaderboardWidget({ userTeamIds = [] }: LeaderboardWidgetProps) {
  const navigate = useNavigate()
  const [topEntries, setTopEntries] = useState<LeaderboardEntry[]>([])
  const [userEntries, setUserEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await leaderboardsApi.getOverall()
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
    navigate(`/leaderboard?teamId=${teamId}`)
  }

  // Memoize the team IDs key to prevent unnecessary re-fetches
  const userTeamIdsKey = useMemo(() => userTeamIds.join(','), [userTeamIds])

  useEffect(() => {
    fetchData()
  }, [userTeamIdsKey])

  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 bg-[#d97706] flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">1</span>
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 bg-gray-400 flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 bg-amber-700 flex items-center justify-center">
          <span className="font-broadcast text-sm text-[#0c0c0c]">3</span>
        </div>
      )
    }
    return (
      <div className="w-7 h-7 bg-white/5 flex items-center justify-center">
        <span className="font-broadcast text-sm text-gray-500">{rank}</span>
      </div>
    )
  }

  return (
    <div className="bg-[#18181b] border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#d97706]" />
          <h2 className="font-broadcast text-xl text-white">LEADERBOARD</h2>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
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
              <Trophy className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="font-broadcast text-lg text-white mb-1">THE RACE STARTS SOON</h3>
            <p className="text-sm text-gray-500">Be the first to claim the top spot!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topEntries.map((entry) => {
              const isUserTeam = userTeamIds.includes(entry.teamId)
              return (
                <div
                  key={entry.teamId}
                  onClick={isUserTeam ? () => handleTeamClick(entry.teamId) : undefined}
                  className={`flex items-center justify-between py-2 px-2 -mx-2 transition-colors ${
                    isUserTeam
                      ? 'bg-[#b91c1c]/10 border border-[#b91c1c]/30 cursor-pointer hover:bg-[#b91c1c]/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {getRankDisplay(entry.rank)}
                    <span className="truncate font-medium text-white">{entry.teamName}</span>
                    {isUserTeam && <span className="text-xs text-gray-500">(You)</span>}
                  </div>
                  <span className="font-broadcast text-lg text-[#d97706] whitespace-nowrap">
                    {entry.totalHrs}
                  </span>
                </div>
              )
            })}

            {userEntries.length > 0 && (
              <>
                <div className="border-t border-dashed border-white/10 my-3" />
                {userEntries.map((entry) => (
                  <div
                    key={entry.teamId}
                    onClick={() => handleTeamClick(entry.teamId)}
                    className="flex items-center justify-between py-2 px-2 -mx-2 bg-[#b91c1c]/10 border border-[#b91c1c]/30 cursor-pointer hover:bg-[#b91c1c]/20 transition-colors mb-1"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-7 h-7 bg-[#b91c1c] flex items-center justify-center">
                        <span className="font-broadcast text-sm text-white">{entry.rank}</span>
                      </div>
                      <span className="truncate font-medium text-white">{entry.teamName}</span>
                      <span className="text-xs text-gray-500">(You)</span>
                    </div>
                    <span className="font-broadcast text-lg text-[#d97706] whitespace-nowrap">
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
        to="/leaderboard"
        className="flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-white font-medium py-4 border-t border-white/10 transition-colors"
      >
        View Full Leaderboard
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
