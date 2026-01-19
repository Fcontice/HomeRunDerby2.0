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
        p-3 rounded-lg border transition-all duration-150
        ${
          isSelected
            ? 'bg-emerald-500/15 border-emerald-500/50'
            : 'bg-slate-800 border-slate-700 hover:bg-slate-750 hover:border-slate-600'
        }
        ${
          isDisabled && !isSelected
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer'
        }
      `}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3">
        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground truncate">{player.name}</h3>
          <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
        </div>

        {/* HR Count */}
        <div className="text-right">
          <div className="text-lg font-bold stat-gold">{player.hrsTotal}</div>
          <div className="text-xs text-muted-foreground">HRs</div>
        </div>

        {/* Add Button */}
        {!isSelected && !isDisabled && (
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-colors">
            <Plus className="h-4 w-4" />
          </div>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
            ✓
          </div>
        )}
      </div>
    </div>
  )
}
