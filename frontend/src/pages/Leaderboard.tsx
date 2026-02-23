import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { leaderboardsApi, LeaderboardEntry } from '../services/api'
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { Navbar } from '../components/Navbar'
import { Button } from '../components/ui/button'
import { Trophy, TrendingUp, Crown } from 'lucide-react'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const highlightTeamId = searchParams.get('teamId')

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab')
    return tab === 'monthly' ? 'monthly' : 'overall'
  })
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const monthParam = searchParams.get('month')
    if (monthParam) return Number(monthParam)
    const currentMonth = new Date().getMonth() + 1
    return currentMonth >= 3 && currentMonth <= 9 ? currentMonth : 3
  })
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Clear highlight param after initial load
  useEffect(() => {
    if (highlightTeamId && !isLoading) {
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
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8 opacity-0 animate-slide-left">
          <div className="inline-block broadcast-lower-third px-6 py-2 mb-3">
            <h1 className="font-broadcast text-3xl md:text-4xl text-white tracking-wide flex items-center gap-3">
              <Trophy className="h-6 w-6" />
              LEADERBOARD
            </h1>
          </div>
          <p className="text-muted-foreground ml-1">
            Track the competition and see who's leading the home run race.
          </p>
        </div>

        {/* Top 3 Podium */}
        {hasEnoughEntries && !isLoading && (
          <div className="mb-8 grid grid-cols-3 gap-3 md:gap-4 opacity-0 animate-fade-up stagger-2">
            {/* 2nd Place */}
            <div className={`relative mt-8 overflow-hidden transition-all ${
              user?.id && topThree[1]?.userId === user.id
                ? 'ring-2 ring-brand-red'
                : ''
            }`} style={{
              background: 'linear-gradient(180deg, hsl(220 14% 35% / 0.4) 0%, hsl(220 14% 20% / 0.3) 100%)',
              border: '1px solid hsl(220 14% 45% / 0.3)',
              boxShadow: 'inset 0 1px 0 hsl(220 14% 60% / 0.15)',
            }}>
              <div className="text-center p-4 md:p-5">
                <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, hsl(220 14% 70%) 0%, hsl(220 14% 50%) 100%)',
                }}>
                  <span className="font-broadcast text-xl text-surface-base">2</span>
                </div>
                <h3 className="font-medium text-white truncate text-sm md:text-base">{topThree[1]?.teamName}</h3>
                <p className="text-xs text-muted-foreground truncate">@{topThree[1]?.username}</p>
                <div className="mt-3 font-broadcast text-2xl md:text-3xl text-white">{topThree[1]?.totalHrs}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest">Home Runs</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className={`relative overflow-hidden ${
              user?.id && topThree[0]?.userId === user.id
                ? 'ring-2 ring-brand-red'
                : ''
            }`} style={{
              background: 'linear-gradient(180deg, hsl(43 96% 52% / 0.15) 0%, hsl(43 96% 40% / 0.05) 100%)',
              border: '2px solid hsl(43 96% 52% / 0.4)',
              boxShadow: '0 0 30px hsl(43 96% 52% / 0.1), inset 0 1px 0 hsl(43 96% 52% / 0.2)',
            }}>
              {/* Crown */}
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 bg-accent-amber px-3 py-1.5">
                <Crown className="h-4 w-4 text-surface-base" />
              </div>
              <div className="text-center p-4 md:p-5 pt-8">
                <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center animate-pulse-glow" style={{
                  background: 'linear-gradient(135deg, hsl(43 96% 56%) 0%, hsl(43 80% 42%) 100%)',
                }}>
                  <span className="font-broadcast text-2xl text-surface-base">1</span>
                </div>
                <h3 className="font-medium text-white truncate text-base md:text-lg">{topThree[0]?.teamName}</h3>
                <p className="text-xs text-muted-foreground truncate">@{topThree[0]?.username}</p>
                <div className="mt-3 font-broadcast text-4xl md:text-5xl text-accent-amber broadcast-stat">
                  {topThree[0]?.totalHrs} <span className="text-lg opacity-50">&#9918;</span>
                </div>
                <div className="text-[10px] text-accent-amber/60 uppercase tracking-widest">Home Runs</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className={`relative mt-12 overflow-hidden transition-all ${
              user?.id && topThree[2]?.userId === user.id
                ? 'ring-2 ring-brand-red'
                : ''
            }`} style={{
              background: 'linear-gradient(180deg, hsl(30 60% 40% / 0.3) 0%, hsl(30 50% 25% / 0.2) 100%)',
              border: '1px solid hsl(30 60% 45% / 0.3)',
              boxShadow: 'inset 0 1px 0 hsl(30 60% 55% / 0.15)',
            }}>
              <div className="text-center p-4 md:p-5">
                <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, hsl(30 60% 50%) 0%, hsl(30 60% 35%) 100%)',
                }}>
                  <span className="font-broadcast text-xl text-surface-base">3</span>
                </div>
                <h3 className="font-medium text-white truncate text-sm md:text-base">{topThree[2]?.teamName}</h3>
                <p className="text-xs text-muted-foreground truncate">@{topThree[2]?.username}</p>
                <div className="mt-3 font-broadcast text-2xl md:text-3xl text-white">{topThree[2]?.totalHrs}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-widest">Home Runs</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Leaderboard Card */}
        <div className="bg-surface-card border border-border opacity-0 animate-fade-up stagger-4">
          {/* Tab Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-red" />
                <span className="diamond-accent" />
                <span className="font-broadcast text-lg text-white">
                  {activeTab === 'overall' ? 'SEASON STANDINGS' : `${MONTHS.find(m => m.value === selectedMonth)?.label.toUpperCase()} STANDINGS`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Tabs */}
                <div className="flex bg-surface-deep p-1">
                  <button
                    onClick={() => setActiveTab('overall')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === 'overall'
                        ? 'bg-brand-red text-white'
                        : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 text-sm font-medium transition-all ${
                      activeTab === 'monthly'
                        ? 'bg-brand-red text-white'
                        : 'text-muted-foreground hover:text-white'
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
                    className="px-3 py-2 border border-border bg-surface-deep text-sm text-white focus:outline-none focus:border-brand-red"
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
                className="border-border text-white hover:bg-white/5"
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
