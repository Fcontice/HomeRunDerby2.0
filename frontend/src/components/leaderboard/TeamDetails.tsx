import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PlayerScore } from '../../services/api'

interface TeamDetailsProps {
  playerScores: PlayerScore[]
}

export function TeamDetails({ playerScores }: TeamDetailsProps) {
  // Memoize sorted players to prevent re-sorting on every render
  const sortedPlayers = useMemo(
    () => [...playerScores].sort((a, b) => b.hrsTotal - a.hrsTotal),
    [playerScores]
  )

  return (
    <div className="bg-[#0c0c0c] p-4 border-t border-white/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {sortedPlayers.map((player) => (
          <div
            key={player.playerId}
            className={`flex items-center justify-between p-3 border transition-all ${
              player.included
                ? 'bg-[#18181b] border-emerald-500/30'
                : 'bg-[#18181b]/50 border-white/5 opacity-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {player.included ? (
                <div className="w-5 h-5 bg-emerald-500 flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              ) : (
                <div className="w-5 h-5 bg-white/5 flex items-center justify-center text-gray-600 text-xs">
                  -
                </div>
              )}
              <div>
                <Link
                  to={`/players/${player.playerId}`}
                  className={`font-medium text-sm hover:text-[#d97706] ${player.included ? 'text-white' : 'text-gray-500'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {player.playerName}
                </Link>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-broadcast text-lg ${player.included ? 'text-[#d97706]' : 'text-gray-600'}`}>
                {player.hrsTotal}
              </p>
              <p className="text-xs text-gray-600">HRs</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3 text-center">
        Best 7 of 8 players count toward team score
      </p>
    </div>
  )
}
