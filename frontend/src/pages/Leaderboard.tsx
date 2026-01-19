import { useState, useEffect } from 'react'
import { leaderboardsApi, LeaderboardEntry } from '../services/api'
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Trophy } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<TabType>('overall')
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const currentMonth = new Date().getMonth() + 1
    return currentMonth >= 3 && currentMonth <= 9 ? currentMonth : 9
  })
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-gold" />
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">
            Track the competition and see who's leading the home run race.
          </p>
        </div>

        <Card className="animate-fade-up stagger-1">
          <CardHeader className="pb-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-slate-800/50 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('overall')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'overall'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Overall
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'monthly'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
              </div>
              {activeTab === 'monthly' && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-700 rounded-md bg-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={fetchLeaderboard}>
                  Try Again
                </Button>
              </div>
            ) : (
              <LeaderboardTable
                entries={entries}
                type={activeTab}
                isLoading={isLoading}
                onRefresh={fetchLeaderboard}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
