import { useState, useEffect } from 'react'
import { leaderboardsApi, LeaderboardEntry } from '../services/api'
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Button } from '../components/ui/button'

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
    // Default to current month if in season (March-September), otherwise September
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Home Run Derby 2026 Leaderboard</h1>

        <Card>
          <CardHeader className="pb-2">
            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={activeTab === 'overall' ? 'default' : 'outline'}
                onClick={() => setActiveTab('overall')}
              >
                Overall
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('monthly')}
                >
                  Monthly
                </Button>
                {activeTab === 'monthly' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-2 border rounded-md bg-white dark:bg-gray-800 text-sm"
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
          </CardHeader>

          <CardContent className="p-0">
            {error ? (
              <div className="text-center py-12 text-red-600">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchLeaderboard} className="mt-4">
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
      </div>
    </div>
  )
}
