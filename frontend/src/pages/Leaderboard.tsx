import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { leaderboardsApi, LeaderboardEntry } from '../services/api'
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { Navbar } from '../components/Navbar'
import { Button } from '../components/ui/button'
import { Trophy, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type TabType = 'overall' | 'monthly'

const MONTHS = [
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
]

export default function Leaderboard() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightTeamId = searchParams.get('teamId')
  const tabParam = searchParams.get('tab')
  const monthParam = searchParams.get('month')

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return tabParam === 'monthly' ? 'monthly' : 'overall'
  })
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (monthParam) {
      const parsed = parseInt(monthParam, 10)
      if (parsed >= 3 && parsed <= 9) return parsed
    }
    const currentMonth = new Date().getMonth() + 1
    // Default to current month if in season (Mar-Sep), otherwise March
    return currentMonth >= 3 && currentMonth <= 9 ? currentMonth : 3
  })
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Clear highlight param after initial load
  useEffect(() => {
    if (highlightTeamId && !isLoading) {
      // Remove the teamId param after a short delay to allow scrolling
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightTeamId, isLoading, setSearchParams])

  const fetchLeaderboard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = activeTab === 'overall'
        ? await leaderboardsApi.getOverall()
        : await leaderboardsApi.getMonthly(selectedMonth)

      if (response.success && response.data) {
        setEntries(response.data.leaderboard)
      } else {
        setError(response.error?.message || 'Failed to load leaderboard')
      }
    } catch (err) {
      setError('Failed to load leaderboard. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [activeTab, selectedMonth])

  // Get top 3 for podium display
  const topThree = entries.slice(0, 3)
  const hasEnoughEntries = entries.length >= 3

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#b91c1c]" />
            <h1 className="font-broadcast text-4xl text-white tracking-wide">LEADERBOARD</h1>
          </div>
          <p className="text-gray-500 ml-4">
            Track the competition and see who's leading the home run race.
          </p>
        </div>

        {/* Top 3 Podium - Only show when we have entries */}
        {hasEnoughEntries && !isLoading && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            {/* 2nd Place */}
            <div className={`bg-[#18181b] border p-4 mt-8 ${
              topThree[1]?.userId === user?.id
                ? 'border-[#b91c1c] ring-2 ring-[#b91c1c] bg-[#b91c1c]/10'
                : 'border-white/10'
            }`}>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 bg-gray-400 flex items-center justify-center">
                  <span className="font-broadcast text-xl text-[#0c0c0c]">2</span>
                </div>
                <h3 className="font-medium text-white truncate">{topThree[1]?.teamName}</h3>
                <p className="text-xs text-gray-500 truncate">@{topThree[1]?.username}</p>
                <div className="mt-2 font-broadcast text-2xl text-[#d97706]">{topThree[1]?.totalHrs}</div>
                <div className="text-xs text-gray-500">HOME RUNS</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className={`bg-[#18181b] border-2 p-4 relative ${
              topThree[0]?.userId === user?.id
                ? 'border-[#b91c1c] ring-2 ring-[#b91c1c] bg-[#b91c1c]/10'
                : 'border-[#d97706]/50'
            }`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#d97706] px-3 py-1">
                <Trophy className="h-4 w-4 text-[#0c0c0c]" />
              </div>
              <div className="text-center mt-2">
                <div className="w-12 h-12 mx-auto mb-2 bg-[#d97706] flex items-center justify-center">
                  <span className="font-broadcast text-2xl text-[#0c0c0c]">1</span>
                </div>
                <h3 className="font-medium text-white truncate text-lg">{topThree[0]?.teamName}</h3>
                <p className="text-xs text-gray-500 truncate">@{topThree[0]?.username}</p>
                <div className="mt-2 font-broadcast text-3xl text-[#d97706]">{topThree[0]?.totalHrs}</div>
                <div className="text-xs text-gray-500">HOME RUNS</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className={`bg-[#18181b] border p-4 mt-12 ${
              topThree[2]?.userId === user?.id
                ? 'border-[#b91c1c] ring-2 ring-[#b91c1c] bg-[#b91c1c]/10'
                : 'border-white/10'
            }`}>
              <div className="text-center">
                <div className="w-10 h-10 mx-auto mb-2 bg-amber-700 flex items-center justify-center">
                  <span className="font-broadcast text-xl text-[#0c0c0c]">3</span>
                </div>
                <h3 className="font-medium text-white truncate">{topThree[2]?.teamName}</h3>
                <p className="text-xs text-gray-500 truncate">@{topThree[2]?.username}</p>
                <div className="mt-2 font-broadcast text-2xl text-[#d97706]">{topThree[2]?.totalHrs}</div>
                <div className="text-xs text-gray-500">HOME RUNS</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Leaderboard Card */}
        <div className="bg-[#18181b] border border-white/10">
          {/* Tab Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#b91c1c]" />
                <span className="font-broadcast text-lg text-white">
                  {activeTab === 'overall' ? 'SEASON STANDINGS' : `${MONTHS.find(m => m.value === selectedMonth)?.label.toUpperCase()} STANDINGS`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex bg-[#0c0c0c] p-1">
                  <button
                    onClick={() => setActiveTab('overall')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === 'overall'
                        ? 'bg-[#b91c1c] text-white'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === 'monthly'
                        ? 'bg-[#b91c1c] text-white'
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                {/* Month Selector */}
                {activeTab === 'monthly' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-2 border border-white/10 bg-[#0c0c0c] text-sm text-white focus:outline-none focus:border-[#b91c1c]"
                  >
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={fetchLeaderboard}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <LeaderboardTable
              entries={entries}
              type={activeTab}
              isLoading={isLoading}
              onRefresh={fetchLeaderboard}
              highlightTeamId={highlightTeamId}
              currentUserId={user?.id}
            />
          )}
        </div>
      </main>
    </div>
  )
}
