/**
 * PlayerCard Component
 * Displays a single player with their stats in a clickable card format
 */

import { Player } from '../../services/api'
import { Card } from '../ui/card'

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
    <Card
      className={`
        p-4 cursor-pointer transition-all duration-200
        ${
          isSelected
            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'hover:shadow-md hover:scale-[1.02]'
        }
        ${
          isDisabled
            ? 'opacity-50 cursor-not-allowed hover:shadow-none hover:scale-100'
            : ''
        }
      `}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{player.name}</h3>
          <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
        </div>

        <div className="ml-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {player.hrsTotal}
            </div>
            <div className="text-xs text-muted-foreground">HRs</div>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
          ✓ Selected
        </div>
      )}
    </Card>
  )
}
