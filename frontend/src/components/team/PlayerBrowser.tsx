/**
 * PlayerBrowser Component
 * Browse and search available players to add to roster
 */

import { useState, useMemo } from 'react'
import { Player } from '../../services/api'
import { Input } from '../ui/input'
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

  // Filter players based on search
  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      return (
        searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.teamAbbr.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })
  }, [players, searchQuery])

  // Check if player is already selected
  const isPlayerSelected = (playerId: string) => {
    return selectedPlayers.some((p) => p.id === playerId)
  }

  // Check if roster is full
  const isRosterFull = selectedPlayers.length >= 8

  return (
    <div className="p-6 bg-surface-card border border-border">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-brand-red" />
          <h2 className="font-broadcast text-xl text-white">AVAILABLE PLAYERS</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          2025 Season • {filteredPlayers.length} eligible players
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-deep border-border text-white placeholder:text-muted-foreground focus:border-brand-red"
          />
        </div>
      </div>

      {/* Player Grid */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto overflow-x-hidden pr-2 -mr-2 scrollbar-thin">
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
          <p className="text-sm mt-2">Try adjusting your search</p>
        </div>
      )}

      {/* Status Message */}
      {isRosterFull && (
        <div className="mt-4 text-sm text-accent-blue text-center">
          Roster is full (8/8). Remove a player to add another.
        </div>
      )}
    </div>
  )
}
