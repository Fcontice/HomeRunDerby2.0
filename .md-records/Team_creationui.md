Build the Team Creation UI for MLB Home Run Pool using the existing API and components.

PROJECT CONTEXT:
- Backend API ready: GET /api/players, POST /api/teams
- API client exists: frontend/src/services/api.ts (playersApi, teamsApi)
- shadcn/ui components available: Button, Card, Input, Label, Alert
- For 2026 contest: select players from 2025 season (seasonYear=2025)
- Player data from PlayerSeasonStats: { id, name, teamAbbr, seasonYear, hrsTotal }
- Validation: exactly 8 players, max 172 combined HRs from previous year

IMPLEMENTATION TASKS:

═══════════════════════════════════════════════════════════
STEP 1: Create Team Creation Page
═══════════════════════════════════════════════════════════

File: frontend/src/pages/CreateTeam.tsx

Requirements:
- Fetch 2025 players on mount: playersApi.getPlayers({ seasonYear: 2025, minHrs: 10 })
- Two-column layout:
  LEFT: Player browser (search/filter)
  RIGHT: Team roster (8 slots) + validation
- Track selected players (array of Player objects)
- Real-time HR total calculation
- Form validation before submit
- Use existing API types from api.ts

Code structure:
```typescript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { playersApi, teamsApi, Player } from '../services/api'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
// ... other imports

export default function CreateTeam() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      const response = await playersApi.getPlayers({ 
        seasonYear: 2025, 
        minHrs: 10,
        sortBy: 'hrs',
        sortOrder: 'desc'
      })
      // Set players from response.data.players
    }
    fetchPlayers()
  }, [])
  
  // Calculate total HRs
  const totalHRs = selectedPlayers.reduce((sum, p) => sum + p.hrsTotal, 0)
  
  // Validation
  const canSubmit = selectedPlayers.length === 8 && 
                    totalHRs <= 172 && 
                    teamName.trim().length > 0
  
  // Handle submit
  const handleSubmit = async () => {
    const playerIds = selectedPlayers.map(p => p.id)
    await teamsApi.createTeam({
      name: teamName,
      seasonYear: 2026, // Contest year
      playerIds
    })
    // Navigate to /teams
  }
  
  return (
    // Layout with player browser and roster
  )
}
```

═══════════════════════════════════════════════════════════
STEP 2: Create Player Browser Component
═══════════════════════════════════════════════════════════

File: frontend/src/components/team/PlayerBrowser.tsx

Requirements:
- Search input (filters players by name)
- Team filter dropdown (optional)
- Display available players in grid/list
- Click player to add to roster
- Disable if already selected or roster full
- Show player: name, team, HRs

Props:
```typescript
interface PlayerBrowserProps {
  players: Player[]
  selectedPlayers: Player[]
  onSelectPlayer: (player: Player) => void
}
```

═══════════════════════════════════════════════════════════
STEP 3: Create Team Roster Component
═══════════════════════════════════════════════════════════

File: frontend/src/components/team/TeamRoster.tsx

Requirements:
- Show 8 numbered slots
- Display selected players with: name, team, HRs
- Remove button for each player
- Empty state for unfilled slots
- Total HR counter at bottom
- Validation status (✓ or ✗)

Props:
```typescript
interface TeamRosterProps {
  selectedPlayers: Player[]
  onRemovePlayer: (playerId: string) => void
  totalHRs: number
  maxHRs: number // 172
}
```

Show validation warnings:
- "Need 8 players" if < 8
- "Total HRs: 180/172 ⚠️" if > 172
- "Ready to submit ✓" if valid

═══════════════════════════════════════════════════════════
STEP 4: Create Player Card Component
═══════════════════════════════════════════════════════════

File: frontend/src/components/team/PlayerCard.tsx

Requirements:
- Display: player name, team abbreviation, HR count
- Show as clickable card
- Disabled state when not selectable
- Visual feedback on hover

Props:
```typescript
interface PlayerCardProps {
  player: Player
  onSelect: (player: Player) => void
  isSelected: boolean
  isDisabled: boolean
}
```

═══════════════════════════════════════════════════════════
STEP 5: Add Route to App
═══════════════════════════════════════════════════════════

File: frontend/src/App.tsx

Add protected route:
```typescript
<Route
  path="/create-team"
  element={
    <ProtectedRoute>
      <CreateTeam />
    </ProtectedRoute>
  }
/>
```

═══════════════════════════════════════════════════════════
STEP 6: Update Dashboard with Link
═══════════════════════════════════════════════════════════

File: frontend/src/pages/Dashboard.tsx

Replace "No teams created yet" placeholder with:
```typescript
<Button onClick={() => navigate('/create-team')}>
  Create Your First Team
</Button>
```

═══════════════════════════════════════════════════════════
DESIGN GUIDELINES
═══════════════════════════════════════════════════════════

Layout (CreateTeam.tsx):
- Use existing gradient background: "bg-gradient-to-br from-slate-900 to-slate-800"
- Header with "Create Team" title
- Two-column grid on desktop, stack on mobile
- Use existing Card component for sections

Colors:
- Use existing Tailwind colors (no custom colors)
- Selected players: blue/primary color
- Validation errors: red/destructive
- Success state: green

Components to use:
- Button (from components/ui/button)
- Card (from components/ui/card)
- Input (from components/ui/input)
- Label (from components/ui/label)
- Alert (from components/ui/alert)

Error handling:
- Try/catch around API calls
- Show errors in Alert component
- Loading states with spinner
- Disable submit button during loading

═══════════════════════════════════════════════════════════
TESTING CHECKLIST
═══════════════════════════════════════════════════════════

After implementation, verify:
- [ ] Players load from API (seasonYear=2025, minHrs=10)
- [ ] Search filters players by name
- [ ] Click player adds to roster (if not full)
- [ ] Remove player from roster works
- [ ] Can't add same player twice
- [ ] Can't add 9th player
- [ ] HR total updates in real-time
- [ ] Submit disabled if < 8 players or > 172 HRs
- [ ] Team name required
- [ ] Creates team and redirects to /teams
- [ ] Shows error if API fails

═══════════════════════════════════════════════════════════
IMPLEMENTATION ORDER
═══════════════════════════════════════════════════════════

1. Create PlayerCard.tsx (simplest component)
2. Create TeamRoster.tsx (uses PlayerCard)
3. Create PlayerBrowser.tsx (uses PlayerCard)
4. Create CreateTeam.tsx (uses both components)
5. Add route to App.tsx
6. Update Dashboard.tsx with link
7. Test complete flow

Show me each component one at a time and wait for approval before moving to the next.

Start with PlayerCard.tsx.