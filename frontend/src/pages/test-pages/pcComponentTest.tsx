import { useState } from 'react'
import PlayerCard from '../../components/team/PlayerCard'
import { Player } from '../../services/api'

export default function ComponentTest() {
  // Mock player data for testing
  const mockPlayer: Player = {
    id: '123',
    mlbId: 'aaron-judge',
    name: 'Aaron Judge',
    teamAbbr: 'NYY',
    seasonYear: 2025,
    hrsTotal: 58,
    isEligible: true,
    photoUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const [isSelected, setIsSelected] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Component Preview</h1>
        
        {/* Test different states */}
        <div className="grid grid-cols-3 gap-4">
          {/* Normal state */}
          <div>
            <p className="text-white mb-2">Normal</p>
            <PlayerCard
              player={mockPlayer}
              onSelect={() => console.log('Selected:', mockPlayer.name)}
              isSelected={false}
              isDisabled={false}
            />
          </div>

          {/* Selected state */}
          <div>
            <p className="text-white mb-2">Selected</p>
            <PlayerCard
              player={mockPlayer}
              onSelect={() => setIsSelected(!isSelected)}
              isSelected={true}
              isDisabled={false}
            />
          </div>

          {/* Disabled state */}
          <div>
            <p className="text-white mb-2">Disabled</p>
            <PlayerCard
              player={mockPlayer}
              onSelect={() => {}}
              isSelected={false}
              isDisabled={true}
            />
          </div>
        </div>

        {/* Interactive test */}
        <div className="mt-8">
          <p className="text-white mb-2">Interactive Test</p>
          <PlayerCard
            player={mockPlayer}
            onSelect={() => setIsSelected(!isSelected)}
            isSelected={isSelected}
            isDisabled={false}
          />
          <p className="text-white mt-2">
            Status: {isSelected ? 'Selected ✓' : 'Not selected'}
          </p>
        </div>
      </div>
    </div>
  )
}