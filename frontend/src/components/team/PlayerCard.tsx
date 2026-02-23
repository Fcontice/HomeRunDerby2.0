import { motion } from 'framer-motion'
import { Player } from '../../services/api'
import { getPlayerTier, TIER_CONFIG } from '../../lib/playerTiers'
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

  const tier = getPlayerTier(player.hrsTotal)
  const config = TIER_CONFIG[tier]

  return (
    <motion.div
      whileHover={!isDisabled ? {
        scale: 1.02,
        rotateY: 2,
        rotateX: -1,
      } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative overflow-hidden border transition-all duration-150
        ${
          isSelected
            ? 'bg-accent-green/10 border-accent-green/30'
            : 'bg-surface-base border-border hover:border-white/20'
        }
        ${
          isDisabled && !isSelected
            ? 'opacity-30 cursor-not-allowed'
            : 'cursor-pointer'
        }
        ${!isDisabled && !isSelected && config.glowClass ? `hover:${config.glowClass}` : ''}
      `}
      onClick={handleClick}
      style={{ perspective: 800 }}
    >
      {/* Tier stripe - left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.stripe}`} />

      {/* Holographic sheen for elite tier */}
      {tier === 'elite' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07] animate-holographic-sheen"
          style={{
            backgroundImage: 'linear-gradient(105deg, transparent 40%, hsl(var(--accent-amber) / 0.4) 45%, hsl(var(--accent-amber) / 0.1) 50%, transparent 55%)',
            backgroundSize: '200% 100%',
          }}
        />
      )}

      <div className="p-3 pl-4">
        <div className="flex items-center gap-3">
          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-white truncate">{player.name}</h3>
              {config.label && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
                  {config.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
          </div>

          {/* HR Count */}
          <div className="text-right">
            <div className={`font-broadcast text-xl ${config.hrColor}`}>{player.hrsTotal}</div>
            <div className="text-xs text-muted-foreground">HRs</div>
          </div>

          {/* Add Button */}
          {!isSelected && !isDisabled && (
            <div className="w-7 h-7 bg-white/5 flex items-center justify-center text-muted-foreground hover:bg-brand-red hover:text-white transition-colors">
              <Plus className="h-4 w-4" />
            </div>
          )}

          {/* Selected indicator */}
          {isSelected && (
            <div className="w-7 h-7 bg-accent-green flex items-center justify-center text-white text-xs font-bold">
              ✓
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
