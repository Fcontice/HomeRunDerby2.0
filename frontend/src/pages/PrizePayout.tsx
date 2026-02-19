import { useState, useEffect } from 'react'
import { leaderboardsApi, LeagueStats } from '../services/api'
import { Navbar } from '../components/Navbar'
import { useSeason } from '../contexts/SeasonContext'
import { Trophy, Calendar, Award, Star, Info, Users } from 'lucide-react'

export default function PrizePayout() {
  const { season } = useSeason()
  const [stats, setStats] = useState<LeagueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seasonYear = season?.seasonYear || new Date().getFullYear()

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await leaderboardsApi.getStats(seasonYear)
        if (response.success && response.data) {
          setStats(response.data)
        } else {
          setError(response.error?.message || 'Failed to load stats')
        }
      } catch (err) {
        setError('Failed to load stats. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [seasonYear])

  // Calculate values
  const teamsEntered = stats?.totalTeams || 0
  const leagueTotal = teamsEntered * 100
  const totalPayouts = leagueTotal * 0.9

  // Format number with commas
  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#b91c1c]" />
            <h1 className="font-broadcast text-4xl text-white tracking-wide">PRIZE PAYOUTS</h1>
          </div>
          <p className="text-gray-500 ml-4">
            {seasonYear} Season prize distribution based on total entries.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#18181b] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-[#d97706]" />
              <span className="text-xs text-gray-500 uppercase">Teams Entered</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-white">{teamsEntered}</div>
            )}
          </div>

          <div className="bg-[#18181b] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-[#d97706]" />
              <span className="text-xs text-gray-500 uppercase">League Total</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-white">{formatNumber(leagueTotal)}</div>
            )}
          </div>

          <div className="bg-[#18181b] border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-[#d97706]" />
              <span className="text-xs text-gray-500 uppercase">Total Payouts</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-[#22c55e]">{formatNumber(totalPayouts)}</div>
            )}
          </div>

          <div className="bg-[#18181b] border border-white/10 p-4 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-[#d97706]" />
              <span className="font-broadcast text-xl text-white/60 uppercase">10% Taken</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 mb-8">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Monthly Prizes */}
        <div className="bg-[#18181b] border border-white/10 mb-6">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-[#b91c1c]" />
            <h2 className="font-broadcast text-xl text-white">MONTHLY PRIZES</h2>
            <span className="text-sm text-gray-500 ml-auto">April - September (6 months)</span>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase">Prize (per month)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#d97706] flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">1</span>
                        </div>
                        <span className="text-white font-medium">1st Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">6,000</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">5,000</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">4,000</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-white">4</span>
                        </div>
                        <span className="text-white font-medium">4th Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">2,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Per month: 17,000</span>
              <span className="font-broadcast text-[#d97706]">Total: 102,000</span>
            </div>
          </div>
        </div>

        {/* All-Star Break */}
        <div className="bg-[#18181b] border border-white/10 mb-6">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <Star className="h-5 w-5 text-[#b91c1c]" />
            <h2 className="font-broadcast text-xl text-white">ALL-STAR BREAK</h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#d97706] flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">1</span>
                        </div>
                        <span className="text-white font-medium">1st Place</span>
                        <span className="text-xs text-[#d97706]">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">2,500</td>
                  </tr>
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                        <span className="text-xs text-[#d97706]">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">1,600</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-[#0c0c0c]">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                        <span className="text-xs text-[#d97706]">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">1,310</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-gray-500 text-sm">* Adjusted for 30th Anniversary Prizes</span>
              <span className="font-broadcast text-[#d97706]">Total: 5,410</span>
            </div>
          </div>
        </div>

        {/* Year End */}
        <div className="bg-[#18181b] border border-white/10 mb-6">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-[#b91c1c]" />
            <h2 className="font-broadcast text-xl text-white">YEAR END</h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { place: 1, prize: 30000, bg: 'bg-[#d97706]' },
                    { place: 2, prize: 24000, bg: 'bg-gray-400' },
                    { place: 3, prize: 17000, bg: 'bg-amber-700' },
                    { place: 4, prize: 12000, bg: 'bg-white/10' },
                    { place: 5, prize: 9000, bg: 'bg-white/10' },
                    { place: 6, prize: 7000, bg: 'bg-white/10' },
                    { place: 7, prize: 6000, bg: 'bg-white/10' },
                  ].map(({ place, prize, bg }) => (
                    <tr key={place} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${bg} flex items-center justify-center`}>
                            <span className={`font-broadcast text-sm ${bg.includes('d97706') || bg.includes('gray-400') || bg.includes('amber') ? 'text-[#0c0c0c]' : 'text-white'}`}>{place}</span>
                          </div>
                          <span className="text-white font-medium">{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`} Place</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-broadcast text-lg text-[#22c55e]">{formatNumber(prize)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
                          <span className="font-broadcast text-xs text-white">8-11</span>
                        </div>
                        <span className="text-white font-medium">8th - 11th Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-broadcast text-lg text-[#22c55e]">5,000</span>
                      <span className="text-gray-500 text-sm ml-2">each</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
                          <span className="font-broadcast text-xs text-white">12-15</span>
                        </div>
                        <span className="text-white font-medium">12th - 15th Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-broadcast text-lg text-[#22c55e]">3,000</span>
                      <span className="text-gray-500 text-sm ml-2">each</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
              <span className="font-broadcast text-[#d97706]">Total: 137,000</span>
            </div>
          </div>
        </div>

        {/* 30th Anniversary Prizes */}
        <div className="bg-[#18181b] border border-[#d97706]/30 mb-6">
          <div className="p-4 border-b border-[#d97706]/30 flex items-center gap-3 bg-[#d97706]/10">
            <Award className="h-5 w-5 text-[#d97706]" />
            <h2 className="font-broadcast text-xl text-white">30TH ANNIVERSARY PRIZES</h2>
            <span className="text-sm text-[#d97706] ml-auto">4,800 Total</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#0c0c0c] p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-[#d97706]">2-9 PRIZE</span>
                  <span className="text-sm text-gray-500">300/month</span>
                </div>
                <p className="text-gray-400 text-sm">
                  End the month with a player at exactly 2 HR and a player at exactly 9 HR.
                </p>
              </div>

              <div className="bg-[#0c0c0c] p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-[#d97706]">TRIPLE 2s</span>
                  <span className="text-sm text-gray-500">300/month</span>
                </div>
                <p className="text-gray-400 text-sm">
                  End the month with 3 players at exactly 2 HR.
                </p>
              </div>

              <div className="bg-[#0c0c0c] p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-[#d97706]">TRIPLE 9s</span>
                  <span className="text-sm text-gray-500">300/month (4 months)</span>
                </div>
                <p className="text-gray-400 text-sm">
                  End the month with 3 players at exactly 9 HR.
                </p>
              </div>
            </div>

            <div className="bg-[#b91c1c]/10 border border-[#b91c1c]/30 p-3">
              <p className="text-sm text-gray-300">
                <span className="text-[#b91c1c] font-medium">Tiebreaker:</span> Team owner to attain stats FIRST wins the prize.
              </p>
            </div>
          </div>
        </div>

        {/* Tiebreaker Explanation */}
        <div className="bg-[#18181b] border border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <Info className="h-5 w-5 text-[#b91c1c]" />
            <h2 className="font-broadcast text-xl text-white">TIEBREAKER RULES</h2>
          </div>
          <div className="p-4">
            <p className="text-gray-400 mb-4">
              When multiple teams tie for a prize position, the prizes for those positions are combined and divided equally among the tied teams.
            </p>
            <div className="bg-[#0c0c0c] p-4 border border-white/10">
              <p className="text-sm text-gray-500 mb-2">Example:</p>
              <p className="text-gray-300">
                If 3 teams tie for 2nd place with 190 HR each, the 2nd, 3rd, and 4th place prizes are combined:
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="bg-white/10 px-3 py-1 text-sm text-white">5,000</span>
                <span className="text-gray-500">+</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">4,000</span>
                <span className="text-gray-500">+</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">2,000</span>
                <span className="text-gray-500">=</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">11,000</span>
                <span className="text-gray-500">/</span>
                <span className="text-gray-400">3 teams</span>
                <span className="text-gray-500">=</span>
                <span className="bg-[#22c55e]/20 px-3 py-1 text-sm text-[#22c55e] font-broadcast">3,667 each</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
