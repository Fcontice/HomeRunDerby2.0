/**
 * PlayerBrowser Component
 * Browse and search available players to add to roster
 */

import { useState, useMemo } from 'react'
import { Player } from '../../services/api'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import PlayerCard from './PlayerCard'
import { Search } from 'lucide-react'

interface PlayerBrowserProps {
  players: Player[]
  selectedPlayers: Player[]
  onSelectPlayer: (player: Player) => void
}

export default function PlayerBrowser({
  players,
  selectedPlayers,
  onSelectPlayer,
}: PlayerBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  // Get unique teams for filter dropdown
  const uniqueTeams = useMemo(() => {
    const teams = new Set(players.map((p) => p.teamAbbr))
    return Array.from(teams).sort()
  }, [players])

  // Filter players based on search and team filter
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.teamAbbr.toLowerCase().includes(searchQuery.toLowerCase())

      // Team filter
      const matchesTeam = teamFilter === 'all' || player.teamAbbr === teamFilter

      return matchesSearch && matchesTeam
    })
  }, [players, searchQuery, teamFilter])

  // Check if player is already selected
  const isPlayerSelected = (playerId: string) => {
    return selectedPlayers.some((p) => p.id === playerId)
  }

  // Check if roster is full
  const isRosterFull = selectedPlayers.length >= 8

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Available Players</h2>
        <p className="text-sm text-muted-foreground">
          2025 Season • {filteredPlayers.length} players
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search Input */}
        <div className="relative">
          <Label htmlFor="search" className="sr-only">
            Search players
          </Label>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Search by name or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Team Filter */}
        <div>
          <Label htmlFor="team-filter" className="text-sm mb-2 block">
            Filter by Team
          </Label>
          <select
            id="team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Teams ({players.length})</option>
            {uniqueTeams.map((team) => {
              const count = players.filter((p) => p.teamAbbr === team).length
              return (
                <option key={team} value={team}>
                  {team} ({count})
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Player Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onSelect={onSelectPlayer}
              isSelected={isPlayerSelected(player.id)}
              isDisabled={isPlayerSelected(player.id) || isRosterFull}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No players found</p>
          <p className="text-sm mt-2">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Status Message */}
      {isRosterFull && (
        <div className="mt-4 text-sm text-amber-600 dark:text-amber-400 text-center">
          Roster is full (8/8). Remove a player to add another.
        </div>
      )}
    </Card>
  )
}
