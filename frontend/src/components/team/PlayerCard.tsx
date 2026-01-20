/**
 * PlayerCard Component
 * Displays a single player with their stats in a clickable card format
 */

import { Player } from '../../services/api'
import { Plus } from 'lucide-react'

interface PlayerCardProps {
  player: Player
  onSelect: (player: Player) => void
  isSelected: boolean
  isDisabled: boolean
}

export default function PlayerCard({
  player,
  onSelect,
  isSelected,
  isDisabled,
}: PlayerCardProps) {
  const handleClick = () => {
    if (!isDisabled) {
      onSelect(player)
    }
  }

  return (
    <div
      className={`
        p-3 border transition-all duration-150
        ${
          isSelected
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-[#0c0c0c] border-white/5 hover:border-white/20 hover:bg-white/5'
        }
        ${
          isDisabled && !isSelected
            ? 'opacity-30 cursor-not-allowed'
            : 'cursor-pointer'
        }
      `}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-white truncate">{player.name}</h3>
          <p className="text-xs text-gray-500">{player.teamAbbr}</p>
        </div>

        {/* HR Count */}
        <div className="text-right">
          <div className="font-broadcast text-xl text-[#d97706]">{player.hrsTotal}</div>
          <div className="text-xs text-gray-500">HRs</div>
        </div>

        {/* Add Button */}
        {!isSelected && !isDisabled && (
          <div className="w-7 h-7 bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#b91c1c] hover:text-white transition-colors">
            <Plus className="h-4 w-4" />
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="w-7 h-7 bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
            ✓
          </div>
        )}
      </div>
    </div>
  )
}
