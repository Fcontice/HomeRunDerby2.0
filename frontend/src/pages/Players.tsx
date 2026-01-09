import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { playersApi, Player } from '../services/api'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Search } from 'lucide-react'

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
  const [teamFilter, setTeamFilter] = useState<string>('')

  useEffect(() => {
    const fetchPlayers = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await playersApi.getPlayers({
          minHrs: 10,
          sortBy: 'hrs',
          sortOrder: 'desc',
          team: teamFilter || undefined,
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Player Pool</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Teams</SelectItem>
              {MLB_TEAMS.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading players...</p>
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && !error && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {players.length} eligible players (10+ HRs in 2025)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player) => (
                <Link key={player.id} to={`/players/${player.id}`}>
                  <Card className="p-4 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover bg-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                          {getInitials(player.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{player.name}</h3>
                        <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{player.hrsTotal}</div>
                        <div className="text-xs text-muted-foreground">HRs</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {players.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No players found matching your criteria.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
