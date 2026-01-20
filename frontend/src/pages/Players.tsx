import { useState, useEffect } from 'react'
import { playersApi, Player, PlayerProfile } from '../services/api'
import { Navbar } from '../components/Navbar'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Button } from '../components/ui/button'
import { Search, Users, ChevronRight, Filter, X, Trophy, Target, TrendingUp, Loader2 } from 'lucide-react'

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

  // Player details panel state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isPanelLoading, setIsPanelLoading] = useState(false)

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

  // Handle player card click
  const handlePlayerClick = async (playerId: string) => {
    setIsPanelOpen(true)
    setIsPanelLoading(true)
    setSelectedPlayer(null)

    try {
      const response = await playersApi.getPlayerById(playerId)
      if (response.success && response.data) {
        setSelectedPlayer(response.data)
      }
    } catch (err) {
      console.error('Failed to load player details:', err)
    } finally {
      setIsPanelLoading(false)
    }
  }

  // Close panel
  const closePanel = () => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedPlayer(null), 300) // Clear after animation
  }

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#b91c1c]" />
            <h1 className="font-broadcast text-4xl text-white tracking-wide">
              PLAYER POOL
            </h1>
          </div>
          <p className="text-gray-500 ml-4">
            Browse eligible players and build your winning lineup.
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-[#18181b] border border-white/10 mb-6">
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <div className="w-1 h-5 bg-[#d97706]" />
            <h2 className="font-broadcast text-lg text-white">FILTERS</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0c0c0c] border-white/10 text-white placeholder:text-gray-600 rounded-none focus:border-[#b91c1c] focus:ring-[#b91c1c]"
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-[#0c0c0c] border-white/10 text-white rounded-none focus:ring-[#b91c1c]">
                  <Filter className="h-4 w-4 mr-2 text-gray-500" />
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-white/10">
                  <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">All Teams</SelectItem>
                  {MLB_TEAMS.map((team) => (
                    <SelectItem key={team} value={team} className="text-white focus:bg-white/10 focus:text-white">
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-[#18181b] border border-white/10 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#b91c1c]/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="font-broadcast text-xl text-white mb-2">SOMETHING WENT WRONG</h3>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-none"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-[#18181b] border border-white/10 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-white/5 mb-2" />
                    <div className="h-3 w-12 bg-white/5" />
                  </div>
                  <div className="text-right">
                    <div className="h-6 w-8 bg-white/5 mb-1" />
                    <div className="h-3 w-6 bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && !error && (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#b91c1c] flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm text-gray-500">
                  <span className="font-broadcast text-lg text-white mr-1">{players.length}</span>
                  eligible players (10+ HRs in 2025)
                </p>
              </div>
            </div>

            {/* Player Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player, index) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player.id)}
                  className="opacity-0 animate-fade-up text-left"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="bg-[#18181b] border border-white/10 p-4 hover:border-white/20 hover:bg-white/5 transition-all group">
                    <div className="flex items-center gap-3">
                      {/* Player Photo */}
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="w-12 h-12 object-cover bg-[#0c0c0c] border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-[#b91c1c] flex items-center justify-center">
                          <span className="font-broadcast text-sm text-white">
                            {getInitials(player.name)}
                          </span>
                        </div>
                      )}

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-white truncate group-hover:text-[#d97706] transition-colors">
                          {player.name}
                        </h3>
                        <p className="text-xs text-gray-500">{player.teamAbbr}</p>
                      </div>

                      {/* HR Stats */}
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <div className="font-broadcast text-2xl text-[#d97706]">{player.hrsTotal}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">HRs</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Empty State */}
            {players.length === 0 && (
              <div className="bg-[#18181b] border border-white/10 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
                  <Search className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="font-broadcast text-xl text-white mb-2">NO PLAYERS FOUND</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Try adjusting your search or filters to find players.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Player Details Slide-Out Panel */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0c0c0c] border-l border-white/10 z-50 transform transition-transform duration-300 ease-out ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-[#b91c1c]" />
            <h2 className="font-broadcast text-lg text-white">PLAYER DETAILS</h2>
          </div>
          <button
            onClick={closePanel}
            className="w-8 h-8 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          {isPanelLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#b91c1c]" />
            </div>
          )}

          {!isPanelLoading && selectedPlayer && (
            <div className="space-y-4">
              {/* Player Header */}
              <div className="bg-[#18181b] border border-white/10 p-4">
                <div className="flex items-center gap-4">
                  {/* Player Photo */}
                  {selectedPlayer.photoUrl ? (
                    <img
                      src={selectedPlayer.photoUrl}
                      alt={selectedPlayer.name}
                      className="w-20 h-20 object-cover bg-[#0c0c0c] border border-white/10"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-[#b91c1c] flex items-center justify-center">
                      <span className="font-broadcast text-2xl text-white">
                        {getInitials(selectedPlayer.name)}
                      </span>
                    </div>
                  )}

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-broadcast text-xl text-white truncate">
                      {selectedPlayer.name.toUpperCase()}
                    </h3>
                    <p className="text-gray-500">{selectedPlayer.teamAbbr}</p>
                  </div>

                  {/* HR Badge */}
                  <div className="text-center">
                    <div className="font-broadcast text-4xl text-[#d97706]">
                      {selectedPlayer.latestSeasonStats?.hrsTotal || 0}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider">
                      {selectedPlayer.latestSeasonStats?.seasonYear || 'N/A'} HRs
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Eligibility Status */}
                <div className="bg-[#18181b] border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 flex items-center justify-center ${
                      selectedPlayer.latestSeasonStats?.isEligible ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      <Target className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
                  </div>
                  <div className={`font-broadcast text-lg ${
                    selectedPlayer.latestSeasonStats?.isEligible ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {selectedPlayer.latestSeasonStats?.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </div>
                </div>

                {/* Cap Cost */}
                <div className="bg-[#18181b] border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#d97706] flex items-center justify-center">
                      <Trophy className="h-3 w-3 text-[#0c0c0c]" />
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Cap Cost</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.latestSeasonStats?.hrsTotal || 0}
                    <span className="text-gray-500 text-xs">/172</span>
                  </div>
                </div>

                {/* Cap Percentage */}
                <div className="bg-[#18181b] border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-[#b91c1c] flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Cap %</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.capPercentage}%
                  </div>
                </div>

                {/* Draft Count */}
                <div className="bg-[#18181b] border border-white/10 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-white/10 flex items-center justify-center">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Drafted</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.draftCount === 0 ? '-' : selectedPlayer.draftCount}
                  </div>
                </div>
              </div>

              {/* Draft Context Section */}
              <div className="bg-[#18181b] border border-white/10">
                <div className="p-3 border-b border-white/10 flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#d97706]" />
                  <h3 className="font-broadcast text-sm text-white">DRAFT CONTEXT</h3>
                </div>
                <div className="p-3 space-y-2">
                  {/* Cap Impact */}
                  <div className="flex items-center justify-between p-2 bg-[#0c0c0c] border border-white/5">
                    <span className="text-xs text-gray-400">Cap Impact</span>
                    <span className="text-sm text-white">
                      <span className="font-broadcast text-[#d97706]">{selectedPlayer.latestSeasonStats?.hrsTotal || 0}</span> of 172
                    </span>
                  </div>

                  {/* Budget Usage */}
                  <div className="flex items-center justify-between p-2 bg-[#0c0c0c] border border-white/5">
                    <span className="text-xs text-gray-400">Budget</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/10">
                        <div
                          className="h-full bg-[#d97706]"
                          style={{ width: `${Math.min(Number(selectedPlayer.capPercentage), 100)}%` }}
                        />
                      </div>
                      <span className="font-broadcast text-sm text-white">{selectedPlayer.capPercentage}%</span>
                    </div>
                  </div>

                  {/* Popularity */}
                  <div className="flex items-center justify-between p-2 bg-[#0c0c0c] border border-white/5">
                    <span className="text-xs text-gray-400">Popularity</span>
                    <span className="text-sm text-white">
                      {selectedPlayer.draftCount === 0
                        ? 'Not drafted'
                        : `${selectedPlayer.draftCount} team${selectedPlayer.draftCount !== 1 ? 's' : ''}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isPanelLoading && !selectedPlayer && (
            <div className="text-center py-12">
              <p className="text-gray-500">Unable to load player details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
