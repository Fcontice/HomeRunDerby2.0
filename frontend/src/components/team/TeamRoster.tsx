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
    <div className="p-6 bg-[#18181b] border border-white/10">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-5 bg-[#d97706]" />
          <h2 className="font-broadcast text-xl text-white">YOUR ROSTER</h2>
        </div>
        <p className="text-sm text-gray-500">
          8 players • Best 7 count toward your score
        </p>
      </div>

      {/* Roster Slots */}
      <div className="space-y-2 mb-6">
        {slots.map(({ position, player }) => (
          <div
            key={position}
            className={`
              flex items-center gap-3 p-3 border transition-all
              ${player ? 'bg-[#0c0c0c] border-white/10' : 'bg-[#0c0c0c]/50 border-white/5 border-dashed'}
            `}
          >
            {/* Position Number */}
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-broadcast text-lg ${
              player ? 'bg-[#b91c1c] text-white' : 'bg-white/5 text-gray-600'
            }`}>
              {position}
            </div>

            {/* Player Info or Empty State */}
            {player ? (
              <>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/players/${player.id}`}
                    className="font-medium text-sm text-white truncate hover:text-[#d97706] block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {player.name}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {player.teamAbbr}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right mr-2">
                  <div className="font-broadcast text-xl text-[#d97706]">
                    {player.hrsTotal}
                  </div>
                  <div className="text-xs text-gray-500">HRs</div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePlayer(player.id)}
                  className="flex-shrink-0 h-8 w-8 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex-1 text-sm text-gray-600 italic">
                Empty slot
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Validation Status */}
      <div className="border-t border-white/10 pt-4 space-y-3">
        {/* Total HRs */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Cap Used:</span>
          <span
            className={`font-broadcast text-2xl ${
              isOverLimit
                ? 'text-red-500'
                : 'text-white'
            }`}
          >
            {totalHRs} <span className="text-gray-500">/ {maxHRs}</span>
          </span>
        </div>

        {/* Validation Messages */}
        {needsMorePlayers && (
          <div className="text-sm text-[#d97706] flex items-center gap-2">
            <span>Need {8 - selectedPlayers.length} more player{8 - selectedPlayers.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {isOverLimit && (
          <div className="text-sm text-red-500 flex items-center gap-2">
            <span>Over HR limit by {totalHRs - maxHRs}</span>
          </div>
        )}

        {isValid && (
          <div className="text-sm text-emerald-400 flex items-center gap-2">
            <span>Roster complete - ready to submit</span>
          </div>
        )}
      </div>
    </div>
  )
}
