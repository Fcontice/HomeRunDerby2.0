/**
 * TeamRoster Component
 * Displays the 8-player roster with validation status
 */

import { Link } from 'react-router-dom'
import { Player } from '../../services/api'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { X } from 'lucide-react'

interface TeamRosterProps {
  selectedPlayers: Player[]
  onRemovePlayer: (playerId: string) => void
  totalHRs: number
  maxHRs: number // 172
}

export default function TeamRoster({
  selectedPlayers,
  onRemovePlayer,
  totalHRs,
  maxHRs,
}: TeamRosterProps) {
  const isValid = selectedPlayers.length === 8 && totalHRs <= maxHRs
  const isOverLimit = totalHRs > maxHRs
  const needsMorePlayers = selectedPlayers.length < 8

  // Create 8 slots
  const slots = Array.from({ length: 8 }, (_, index) => {
    const player = selectedPlayers[index]
    return { position: index + 1, player }
  })

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Your Roster</h2>
        <p className="text-sm text-muted-foreground">
          Select 8 players (max 172 combined HRs)
        </p>
      </div>

      {/* Roster Slots */}
      <div className="space-y-2 mb-6">
        {slots.map(({ position, player }) => (
          <div
            key={position}
            className={`
              flex items-center gap-3 p-3 rounded-lg border
              ${player ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/50 border-slate-700/50 border-dashed'}
            `}
          >
            {/* Position Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-300">
              {position}
            </div>

            {/* Player Info or Empty State */}
            {player ? (
              <>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/players/${player.id}`}
                    className="font-semibold text-sm truncate hover:text-primary hover:underline block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {player.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {player.teamAbbr}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right mr-2">
                  <div className="font-bold text-primary">
                    {player.hrsTotal}
                  </div>
                  <div className="text-xs text-muted-foreground">HRs</div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePlayer(player.id)}
                  className="flex-shrink-0 h-8 w-8 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex-1 text-sm text-muted-foreground italic">
                Empty slot
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Validation Status */}
      <div className="border-t pt-4 space-y-3">
        {/* Total HRs */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">Total HRs:</span>
          <span
            className={`text-lg font-bold ${
              isOverLimit
                ? 'text-rose-400'
                : 'text-primary'
            }`}
          >
            {totalHRs} / {maxHRs}
          </span>
        </div>

        {/* Validation Messages */}
        {needsMorePlayers && (
          <div className="text-sm text-amber-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>Need {8 - selectedPlayers.length} more player{8 - selectedPlayers.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {isOverLimit && (
          <div className="text-sm text-rose-400 flex items-center gap-2">
            <span>❌</span>
            <span>Over HR limit by {totalHRs - maxHRs}</span>
          </div>
        )}

        {isValid && (
          <div className="text-sm text-emerald-400 flex items-center gap-2">
            <span>✓</span>
            <span className="font-medium">Roster complete!</span>
          </div>
        )}
      </div>
    </Card>
  )
}
