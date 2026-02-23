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
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8 opacity-0 animate-slide-left">
          <div className="inline-block px-6 py-2 mb-3" style={{
            background: 'linear-gradient(90deg, hsl(var(--accent-green)) 0%, hsl(var(--accent-green)) 70%, transparent 100%)',
            clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)',
          }}>
            <h1 className="font-broadcast text-3xl md:text-4xl text-white tracking-wide flex items-center gap-3">
              <Award className="h-6 w-6" />
              PRIZE PAYOUTS
            </h1>
          </div>
          <p className="text-muted-foreground ml-1">
            {seasonYear} Season prize distribution based on total entries.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 opacity-0 animate-fade-up stagger-2">
          <div className="bg-surface-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-accent-blue" />
              <span className="text-xs text-muted-foreground uppercase">Teams Entered</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-white">{teamsEntered}</div>
            )}
          </div>

          <div className="bg-surface-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-accent-amber" />
              <span className="text-xs text-muted-foreground uppercase">League Pool</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-white">{formatNumber(leagueTotal)}</div>
            )}
          </div>

          <div className="bg-surface-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-accent-green" />
              <span className="text-xs text-muted-foreground uppercase">Total Payouts</span>
            </div>
            {isLoading ? (
              <div className="h-8 bg-white/5 animate-pulse" />
            ) : (
              <div className="font-broadcast text-2xl text-accent-green">{formatNumber(totalPayouts)}</div>
            )}
          </div>

          <div className="bg-surface-card border border-border p-4 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-muted-foreground" />
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
        <div className="bg-surface-card border border-border mb-6 opacity-0 animate-fade-up stagger-3">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand-red" />
            <span className="diamond-accent" />
            <h2 className="font-broadcast text-xl text-white">MONTHLY PRIZES</h2>
            <span className="text-sm text-muted-foreground ml-auto">April - September (6 months)</span>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground uppercase">Prize (per month)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent-amber flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">1</span>
                        </div>
                        <span className="text-white font-medium">1st Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">6,000</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">5,000</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">4,000</td>
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
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">2,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Per month: 17,000</span>
              <span className="font-broadcast text-accent-green">Total: 102,000</span>
            </div>
          </div>
        </div>

        {/* All-Star Break */}
        <div className="bg-surface-card border border-border mb-6 opacity-0 animate-fade-up stagger-4">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Star className="h-5 w-5 text-brand-red" />
            <span className="diamond-accent" />
            <h2 className="font-broadcast text-xl text-white">ALL-STAR BREAK</h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground uppercase">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent-amber flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">1</span>
                        </div>
                        <span className="text-white font-medium">1st Place</span>
                        <span className="text-xs text-accent-amber">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">2,500</td>
                  </tr>
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-400 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">2</span>
                        </div>
                        <span className="text-white font-medium">2nd Place</span>
                        <span className="text-xs text-accent-amber">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">1,600</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-700 flex items-center justify-center">
                          <span className="font-broadcast text-sm text-surface-base">3</span>
                        </div>
                        <span className="text-white font-medium">3rd Place</span>
                        <span className="text-xs text-accent-amber">*</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">1,310</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-muted-foreground text-sm">* Adjusted for 30th Anniversary Prizes</span>
              <span className="font-broadcast text-accent-green">Total: 5,410</span>
            </div>
          </div>
        </div>

        {/* Year End */}
        <div className="bg-surface-card border border-border mb-6 opacity-0 animate-fade-up stagger-5">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Trophy className="h-5 w-5 text-brand-red" />
            <span className="diamond-accent" />
            <h2 className="font-broadcast text-xl text-white">YEAR END</h2>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase">Place</th>
                    <th className="text-right py-3 px-4 text-xs text-muted-foreground uppercase">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { place: 1, prize: 30000, bg: 'bg-accent-amber', emoji: '\u26BE' },
                    { place: 2, prize: 24000, bg: 'bg-gray-400', emoji: '' },
                    { place: 3, prize: 17000, bg: 'bg-amber-700', emoji: '' },
                    { place: 4, prize: 12000, bg: 'bg-white/10', emoji: '' },
                    { place: 5, prize: 9000, bg: 'bg-white/10', emoji: '' },
                    { place: 6, prize: 7000, bg: 'bg-white/10', emoji: '' },
                    { place: 7, prize: 6000, bg: 'bg-white/10', emoji: '' },
                  ].map(({ place, prize, bg, emoji }) => (
                    <tr key={place} className="border-b border-border hover:bg-white/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 ${bg} flex items-center justify-center`}>
                            <span className={`font-broadcast text-sm ${bg.includes('accent-amber') || bg.includes('gray-400') || bg.includes('amber') ? 'text-surface-base' : 'text-white'}`}>{place}</span>
                          </div>
                          <span className="text-white font-medium">{place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`} Place</span>
                          {emoji && <span className="text-sm opacity-50">{emoji}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-broadcast text-lg text-accent-green">{formatNumber(prize)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center">
                          <span className="font-broadcast text-xs text-white">8-11</span>
                        </div>
                        <span className="text-white font-medium">8th - 11th Place</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-broadcast text-lg text-accent-green">5,000</span>
                      <span className="text-muted-foreground text-sm ml-2">each</span>
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
                      <span className="font-broadcast text-lg text-accent-green">3,000</span>
                      <span className="text-muted-foreground text-sm ml-2">each</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <span className="font-broadcast text-accent-green">Total: 137,000</span>
            </div>
          </div>
        </div>

        {/* 30th Anniversary Prizes */}
        <div className="bg-surface-card border border-accent-amber/30 mb-6 opacity-0 animate-fade-up stagger-6">
          <div className="p-4 border-b border-accent-amber/30 flex items-center gap-3 bg-accent-amber/10">
            <Award className="h-5 w-5 text-accent-amber" />
            <h2 className="font-broadcast text-xl text-white">30TH ANNIVERSARY PRIZES</h2>
            <span className="text-sm text-accent-amber ml-auto">4,800 Total</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-surface-base p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-accent-amber">2-9 PRIZE</span>
                  <span className="text-sm text-muted-foreground">300/month</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  End the month with a player at exactly 2 HR and a player at exactly 9 HR.
                </p>
              </div>

              <div className="bg-surface-base p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-accent-amber">TRIPLE 2s</span>
                  <span className="text-sm text-muted-foreground">300/month</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  End the month with 3 players at exactly 2 HR.
                </p>
              </div>

              <div className="bg-surface-base p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-broadcast text-accent-amber">TRIPLE 9s</span>
                  <span className="text-sm text-muted-foreground">300/month (4 months)</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  End the month with 3 players at exactly 9 HR.
                </p>
              </div>
            </div>

            <div className="bg-brand-red/10 border border-brand-red/30 p-3">
              <p className="text-sm text-gray-300">
                <span className="text-brand-red font-medium">Tiebreaker:</span> Team owner to attain stats FIRST wins the prize.
              </p>
            </div>
          </div>
        </div>

        {/* Tiebreaker Explanation */}
        <div className="bg-surface-card border border-border opacity-0 animate-fade-up stagger-7">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Info className="h-5 w-5 text-brand-red" />
            <h2 className="font-broadcast text-xl text-white">TIEBREAKER RULES</h2>
          </div>
          <div className="p-4">
            <p className="text-muted-foreground mb-4">
              When multiple teams tie for a prize position, the prizes for those positions are combined and divided equally among the tied teams.
            </p>
            <div className="bg-surface-base p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-2">Example:</p>
              <p className="text-gray-300">
                If 3 teams tie for 2nd place with 190 HR each, the 2nd, 3rd, and 4th place prizes are combined:
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="bg-white/10 px-3 py-1 text-sm text-white">5,000</span>
                <span className="text-muted-foreground">+</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">4,000</span>
                <span className="text-muted-foreground">+</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">2,000</span>
                <span className="text-muted-foreground">=</span>
                <span className="bg-white/10 px-3 py-1 text-sm text-white">11,000</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">3 teams</span>
                <span className="text-muted-foreground">=</span>
                <span className="bg-accent-green/20 px-3 py-1 text-sm text-accent-green font-broadcast">3,667 each</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
