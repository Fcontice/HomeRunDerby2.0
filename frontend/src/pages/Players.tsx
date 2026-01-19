import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi, Player } from '../services/api'
import { Navbar } from '../components/Navbar'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { EmptyState } from '../components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Search, Users } from 'lucide-react'

// MLB team abbreviations for filter dropdown
const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SF', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

export default function Players() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await playersApi.getPlayers({
          minHrs: 10,
          sortBy: 'hrs',
          sortOrder: 'desc',
          team: teamFilter === 'all' ? undefined : teamFilter,
          search: searchQuery || undefined,
        })

        if (response.success && response.data) {
          setPlayers(response.data.players)
        } else {
          setError(response.error?.message || 'Failed to load players')
        }
      } catch (err) {
        setError('Failed to load players. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce search
    const timeoutId = setTimeout(fetchPlayers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, teamFilter])

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Player Pool</h1>
          </div>
          <p className="text-muted-foreground">
            Browse eligible players and build your winning lineup.
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6 animate-fade-up stagger-1">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700"
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-900/50 border-slate-700">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {MLB_TEAMS.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="animate-fade-up">
            <EmptyState
              icon="⚠️"
              title="Something went wrong"
              description={error}
              action={{
                label: 'Try Again',
                onClick: () => window.location.reload(),
                variant: 'outline',
              }}
            />
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-slate-800 rounded mb-2" />
                    <div className="h-3 w-12 bg-slate-800/50 rounded" />
                  </div>
                  <div className="text-right">
                    <div className="h-6 w-8 bg-slate-800 rounded mb-1" />
                    <div className="h-3 w-6 bg-slate-800/50 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && !error && (
          <>
            <div className="flex items-center justify-between mb-4 animate-fade-up stagger-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{players.length}</span> eligible players (10+ HRs in 2025)
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player, index) => (
                <Link key={player.id} to={`/players/${player.id}`}>
                  <Card className={`p-4 cursor-pointer opacity-0 animate-fade-up`} style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'forwards' }}>
                    <div className="flex items-center gap-3">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover bg-slate-800 border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-400">
                          {getInitials(player.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate text-foreground">{player.name}</h3>
                        <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold stat-gold">{player.hrsTotal}</div>
                        <div className="text-xs text-muted-foreground">HRs</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {players.length === 0 && (
              <Card>
                <EmptyState
                  icon="🔍"
                  title="No players found"
                  description="Try adjusting your search or filters to find players."
                />
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
