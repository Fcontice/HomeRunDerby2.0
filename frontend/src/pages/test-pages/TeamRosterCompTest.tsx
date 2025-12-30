import { useState } from 'react'
import TeamRoster from '../../components/team/TeamRoster'
import { Player } from '../../services/api'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export default function ComponentTest() {
  // Mock player data
  const mockPlayers: Player[] = [
    {
      id: '1',
      mlbId: 'aaron-judge',
      name: 'Aaron Judge',
      teamAbbr: 'NYY',
      seasonYear: 2025,
      hrsTotal: 58,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      mlbId: 'shohei-ohtani',
      name: 'Shohei Ohtani',
      teamAbbr: 'LAD',
      seasonYear: 2025,
      hrsTotal: 54,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      mlbId: 'kyle-schwarber',
      name: 'Kyle Schwarber',
      teamAbbr: 'PHI',
      seasonYear: 2025,
      hrsTotal: 38,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      mlbId: 'matt-olson',
      name: 'Matt Olson',
      teamAbbr: 'ATL',
      seasonYear: 2025,
      hrsTotal: 29,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '5',
      mlbId: 'pete-alonso',
      name: 'Pete Alonso',
      teamAbbr: 'NYM',
      seasonYear: 2025,
      hrsTotal: 25,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '6',
      mlbId: 'marcell-ozuna',
      name: 'Marcell Ozuna',
      teamAbbr: 'ATL',
      seasonYear: 2025,
      hrsTotal: 22,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '7',
      mlbId: 'juan-soto',
      name: 'Juan Soto',
      teamAbbr: 'NYY',
      seasonYear: 2025,
      hrsTotal: 20,
      photoUrl: null,
      isEligible: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '8',
      mlbId: 'freddie-freeman',
      name: 'Freddie Freeman',
      teamAbbr: 'LAD',
      seasonYear: 2025,
      hrsTotal: 18,
      photoUrl: null,
      isEligible: true,
    createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  // State for interactive testing
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId))
  }

  const handleAddPlayer = (player: Player) => {
    if (selectedPlayers.length < 8 && !selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(prev => [...prev, player])
    }
  }

  const totalHRs = selectedPlayers.reduce((sum, p) => sum + p.hrsTotal, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">TeamRoster Component Preview</h1>

        {/* Test Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Scenario 1: Empty Roster */}
          <Card>
            <CardHeader>
              <CardTitle>Empty Roster (0 players)</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamRoster
                selectedPlayers={[]}
                onRemovePlayer={() => {}}
                totalHRs={0}
                maxHRs={172}
              />
            </CardContent>
          </Card>

          {/* Scenario 2: Partial Roster */}
          <Card>
            <CardHeader>
              <CardTitle>Partial Roster (4 players - Valid)</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamRoster
                selectedPlayers={mockPlayers.slice(0, 4)}
                onRemovePlayer={() => {}}
                totalHRs={179}
                maxHRs={172}
              />
            </CardContent>
          </Card>

          {/* Scenario 3: Full Roster Over Limit */}
          <Card>
            <CardHeader>
              <CardTitle>Full Roster (8 players - OVER LIMIT)</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamRoster
                selectedPlayers={mockPlayers}
                onRemovePlayer={() => {}}
                totalHRs={264}
                maxHRs={172}
              />
            </CardContent>
          </Card>

          {/* Scenario 4: Valid Full Roster */}
          <Card>
            <CardHeader>
              <CardTitle>Valid Full Roster (8 players - Under 172)</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamRoster
                selectedPlayers={mockPlayers.slice(2, 10)}
                onRemovePlayer={() => {}}
                totalHRs={152}
                maxHRs={172}
              />
            </CardContent>
          </Card>
        </div>

        {/* Interactive Test */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Test</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click players to add them to the roster. Click X to remove.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Available Players */}
              <div>
                <h3 className="font-semibold mb-4">Available Players</h3>
                <div className="space-y-2">
                  {mockPlayers.map(player => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleAddPlayer(player)}
                      disabled={
                        selectedPlayers.length >= 8 || 
                        selectedPlayers.some(p => p.id === player.id)
                      }
                    >
                      <span>{player.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {player.teamAbbr} - {player.hrsTotal} HRs
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Roster */}
              <div>
                <h3 className="font-semibold mb-4">Your Roster</h3>
                <TeamRoster
                  selectedPlayers={selectedPlayers}
                  onRemovePlayer={handleRemovePlayer}
                  totalHRs={totalHRs}
                  maxHRs={172}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
