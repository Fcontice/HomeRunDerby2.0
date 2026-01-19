import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { playersApi, PlayerProfile as PlayerProfileType } from '../services/api'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Navbar } from '../components/Navbar'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerProfileType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await playersApi.getPlayerById(id)
        if (response.success && response.data) {
          setPlayer(response.data)
        } else {
          setError(response.error?.message || 'Player not found')
        }
      } catch (err) {
        setError('Failed to load player. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlayer()
  }, [id])

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-lg">Loading player...</p>
        </div>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold text-destructive mb-4">
              {error || 'Player not found'}
            </p>
            <Link to="/players">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Players
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = player.latestSeasonStats

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Back Link */}
          <Link
            to="/players"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Players
          </Link>

          <Card className="animate-fade-up">
            <CardContent className="pt-6">
              {/* Header: Photo + Name */}
              <div className="flex items-center gap-4 mb-6">
                {player.photoUrl ? (
                  <img
                    src={player.photoUrl}
                    alt={player.name}
                    className="w-20 h-20 rounded-full object-cover bg-slate-800 border border-slate-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
                    {getInitials(player.name)}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{player.name}</h1>
                  <p className="text-lg text-muted-foreground">{player.teamAbbr}</p>
                </div>
              </div>

              {/* Eligibility Stats */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Eligibility Stats
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold stat-gold">
                      {stats?.hrsTotal || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stats?.seasonYear || 'N/A'} HRs
                    </div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                    <div className={`text-lg font-bold ${
                      stats?.isEligible
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {stats?.isEligible ? 'Eligible' : 'Ineligible'}
                    </div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </div>
                </div>
              </div>

              {/* Draft Context */}
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Draft Context
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <span className="text-sm font-medium text-foreground">Cap Cost</span>
                    <span className="font-bold text-foreground">
                      {stats?.hrsTotal || 0}/172 ({player.capPercentage}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <span className="text-sm font-medium text-foreground">Drafted by</span>
                    <span className="font-bold text-foreground">
                      {player.draftCount === 0
                        ? 'Not yet drafted'
                        : `${player.draftCount} team${player.draftCount !== 1 ? 's' : ''}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
