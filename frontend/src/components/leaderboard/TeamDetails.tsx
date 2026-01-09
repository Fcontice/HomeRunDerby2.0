import { Link } from 'react-router-dom'
import { PlayerScore } from '../../services/api'

interface TeamDetailsProps {
  playerScores: PlayerScore[]
}

export function TeamDetails({ playerScores }: TeamDetailsProps) {
  // Sort by HRs descending to show best players first
  const sortedPlayers = [...playerScores].sort((a, b) => b.hrsTotal - a.hrsTotal)

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedPlayers.map((player) => (
          <div
            key={player.playerId}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.included
                ? 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800'
                : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2">
              {player.included ? (
                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
              ) : (
                <span className="text-gray-400 text-sm">○</span>
              )}
              <div>
                <Link
                  to={`/players/${player.playerId}`}
                  className={`font-medium text-sm hover:underline ${!player.included && 'text-gray-500'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {player.playerName}
                </Link>
              </div>
            </div>
            <div className={`text-right ${!player.included && 'text-gray-500'}`}>
              <p className="font-bold">{player.hrsTotal}</p>
              <p className="text-xs text-gray-500">HRs</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Best 7 of 8 players count toward team score
      </p>
    </div>
  )
}
