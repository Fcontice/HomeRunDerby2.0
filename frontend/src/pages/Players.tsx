import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { playersApi } from '../services/api'
import { Navbar } from '../components/Navbar'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Search, Users, ChevronRight, Filter, X, Trophy, Target, TrendingUp, Loader2, Download } from 'lucide-react'
import { getPlayerTier, TIER_CONFIG } from '../lib/playerTiers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// MLB team abbreviations for filter dropdown
const MLB_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SF', 'SEA', 'STL', 'TB', 'TEX', 'TOR', 'WSH'
]

export default function Players() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [debouncedTeam, setDebouncedTeam] = useState<string>('all')

  // Player details panel state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // PDF download dialog state
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false)

  // Debounce search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setDebouncedTeam(teamFilter)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, teamFilter])

  // React Query for player data - cached for 5 minutes
  const { data, isLoading, error } = useQuery({
    queryKey: ['players', debouncedSearch, debouncedTeam],
    queryFn: async () => {
      const response = await playersApi.getPlayers({
        minHrs: 10,
        sortBy: 'hrs',
        sortOrder: 'desc',
        team: debouncedTeam === 'all' ? undefined : debouncedTeam,
        search: debouncedSearch || undefined,
      })
      if (response.success && response.data) {
        return response.data.players
      }
      throw new Error(response.error?.message || 'Failed to load players')
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  })

  const players = data || []
  const errorMessage = error instanceof Error ? error.message : null

  // React Query for player details - cached for 5 minutes
  const {
    data: selectedPlayer,
    isError: isPlayerError,
  } = useQuery({
    queryKey: ['player', selectedPlayerId],
    queryFn: async () => {
      if (!selectedPlayerId) return null
      const response = await playersApi.getPlayerById(selectedPlayerId)
      if (response.success && response.data) {
        return response.data
      }
      throw new Error(response.error?.message || 'Failed to load player details')
    },
    enabled: !!selectedPlayerId && isPanelOpen,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })

  // Prefetch player details on hover (loads in background before click)
  const prefetchPlayer = (playerId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['player', playerId],
      queryFn: async () => {
        const response = await playersApi.getPlayerById(playerId)
        if (response.success && response.data) {
          return response.data
        }
        throw new Error(response.error?.message || 'Failed to load player details')
      },
      staleTime: 5 * 60 * 1000,
    })
  }

  // Handle player card click - stop propagation so it doesn't trigger backdrop close
  const handlePlayerClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation()
    setSelectedPlayerId(playerId)
    setIsPanelOpen(true)
  }

  // Close panel
  const closePanel = () => {
    setIsPanelOpen(false)
    setTimeout(() => setSelectedPlayerId(null), 300) // Clear after animation
  }

  // Generate initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Generate COMPACT PDF (3 pages, landscape, two columns)
  const downloadCompactPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('HOME RUN DERBY 2.0 - Eligible Players 2025', pageWidth / 2, 10, { align: 'center' })

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('10+ HRs in 2025  |  Team Cap: 172 HRs  |  Best 7 of 8 score  |  hrderbyus.com', pageWidth / 2, 14, { align: 'center' })
    doc.setTextColor(0)

    // Two-column newspaper layout: read down col 1, then col 2, then next page
    const tableData: (string | number)[][] = []
    const rowsPerPage = 40
    const playersPerPage = rowsPerPage * 2

    for (let pageStart = 0; pageStart < players.length; pageStart += playersPerPage) {
      for (let row = 0; row < rowsPerPage; row++) {
        const leftIndex = pageStart + row
        const rightIndex = pageStart + rowsPerPage + row
        const left = players[leftIndex]
        const right = players[rightIndex]

        if (!left) break

        const rowData: (string | number)[] = [
          leftIndex + 1, left.name, left.teamAbbr, left.hrsTotal, '|',
        ]

        if (right) {
          rowData.push(rightIndex + 1, right.name, right.teamAbbr, right.hrsTotal)
        } else {
          rowData.push('', '', '', '')
        }
        tableData.push(rowData)
      }
    }

    autoTable(doc, {
      startY: 18,
      margin: { left: 5, right: 5 },
      head: [['#', 'Player', 'TM', 'HR', '', '#', 'Player', 'TM', 'HR']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: 1,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 58 },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 6, halign: 'center', fillColor: [220, 220, 220], textColor: [150, 150, 150] },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 58 },
        7: { cellWidth: 16, halign: 'center' },
        8: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      },
      styles: { fontSize: 6.5, cellPadding: 0.8, lineColor: [200, 200, 200], lineWidth: 0.1 },
      bodyStyles: { lineColor: [230, 230, 230] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(6)
        doc.setTextColor(150)
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}  |  ${players.length} players  |  Generated ${new Date().toLocaleDateString()}`,
          pageWidth / 2, pageHeight - 4, { align: 'center' }
        )
      },
    })

    doc.save('hrd-eligible-players-2025-compact.pdf')
    setIsPdfDialogOpen(false)
  }

  // Generate DETAILED PDF (single column, more info, portrait)
  const downloadDetailedPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('HOME RUN DERBY 2.0', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Eligible Player Pool - 2025 Season', pageWidth / 2, 28, { align: 'center' })

    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text('Players with 10+ HRs in 2025  |  Team Cap: 172 HRs  |  Best 7 of 8 players score', pageWidth / 2, 35, { align: 'center' })
    doc.setTextColor(0)

    const tableData = players.map((player, index) => [
      index + 1,
      player.name,
      player.teamAbbr,
      player.hrsTotal,
      ((player.hrsTotal / 172) * 100).toFixed(1) + '%'
    ])

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Player Name', 'Team', '2025 HRs', 'Cap %']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [185, 28, 28],
        fontSize: 10,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 25, halign: 'center' },
      },
      styles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}  |  hrderbyus.com  |  Generated ${new Date().toLocaleDateString()}`,
          pageWidth / 2, pageHeight - 10, { align: 'center' }
        )
      },
    })

    doc.save('hrd-eligible-players-2025-detailed.pdf')
    setIsPdfDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Broadcast Header */}
        <div className="mb-8 opacity-0 animate-slide-left">
          <div className="inline-block px-6 py-2 mb-3" style={{
            background: 'linear-gradient(90deg, hsl(var(--accent-amber)) 0%, hsl(var(--accent-amber)) 70%, transparent 100%)',
            clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)',
          }}>
            <h1 className="font-broadcast text-3xl md:text-4xl text-surface-base tracking-wide flex items-center gap-3">
              <Users className="h-6 w-6" />
              PLAYER POOL
            </h1>
          </div>
          <p className="text-muted-foreground ml-1">
            Browse eligible players and build your winning lineup.
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-surface-card border border-border mb-6 opacity-0 animate-fade-up stagger-2">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <div className="w-1 h-5 bg-accent-amber" />
            <h2 className="font-broadcast text-lg text-white">FILTERS</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-surface-base border-border text-white placeholder:text-muted-foreground focus:border-brand-red focus:ring-brand-red"
                />
              </div>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-surface-base border-border text-white focus:ring-brand-red">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent className="bg-surface-card border-border">
                  <SelectItem value="all" className="text-white focus:bg-white/10 focus:text-white">All Teams</SelectItem>
                  {MLB_TEAMS.map((team) => (
                    <SelectItem key={team} value={team} className="text-white focus:bg-white/10 focus:text-white">
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Baseball stitch divider */}
        <div className="baseball-divider my-2" />

        {/* Error State */}
        {errorMessage && (
          <div className="bg-surface-card border border-border p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-brand-red/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="font-broadcast text-xl text-white mb-2">SOMETHING WENT WRONG</h3>
            <p className="text-muted-foreground text-sm mb-6">{errorMessage}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-brand-red hover:bg-brand-red-dark text-white"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-surface-card border border-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/5" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-white/5 mb-2" />
                    <div className="h-3 w-12 bg-white/5" />
                  </div>
                  <div className="text-right">
                    <div className="h-6 w-8 bg-white/5 mb-1" />
                    <div className="h-3 w-6 bg-white/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Player Grid */}
        {!isLoading && !errorMessage && (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between mb-4 opacity-0 animate-fade-up stagger-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-red flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-broadcast text-lg text-white mr-1">{players.length}</span>
                  eligible players (10+ HRs in 2025)
                </p>
              </div>
              <Button
                onClick={() => setIsPdfDialogOpen(true)}
                variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white gap-2"
                disabled={players.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </div>

            {/* Player Cards Grid - z-[45] sits above backdrop (z-40) but below panel (z-50) */}
            <div className="relative z-[45] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map((player, index) => {
                const tier = getPlayerTier(player.hrsTotal)
                const config = TIER_CONFIG[tier]
                return (
                  <button
                    key={player.id}
                    onClick={(e) => handlePlayerClick(e, player.id)}
                    onMouseEnter={() => prefetchPlayer(player.id)}
                    className="opacity-0 animate-fade-up text-left"
                    style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className={`relative overflow-hidden bg-surface-card border p-4 ${config.cardBorder} ${config.cardHoverBorder} hover:bg-white/5 transition-all group ${config.cardBg}`}>
                      {/* Tier stripe - left edge */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.stripe}`} />

                      {/* Holographic sheen for elite */}
                      {tier === 'elite' && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-[0.06] animate-holographic-sheen"
                          style={{
                            backgroundImage: 'linear-gradient(105deg, transparent 40%, hsl(var(--accent-amber) / 0.4) 45%, hsl(var(--accent-amber) / 0.1) 50%, transparent 55%)',
                            backgroundSize: '200% 100%',
                          }}
                        />
                      )}

                      <div className="flex items-center gap-3 relative">
                        {/* Player Photo / Initials */}
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-12 h-12 object-cover bg-surface-base border border-border"
                          />
                        ) : (
                          <div className={`w-12 h-12 ${config.initialsBg} flex items-center justify-center`}>
                            <span className={`font-broadcast text-sm ${config.initialsText}`}>
                              {getInitials(player.name)}
                            </span>
                          </div>
                        )}

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm text-white truncate group-hover:text-accent-amber transition-colors">
                              {player.name}
                            </h3>
                            {config.label && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}>
                                {config.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{player.teamAbbr}</p>
                        </div>

                        {/* HR Stats */}
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className={`font-broadcast text-2xl ${config.hrColor}`}>{player.hrsTotal}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">HRs</div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Empty State */}
            {players.length === 0 && (
              <div className="bg-surface-card border border-border p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 flex items-center justify-center">
                  <span className="text-3xl">&#9918;</span>
                </div>
                <h3 className="font-broadcast text-xl text-white mb-2">NO SLUGGERS FOUND</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  No sluggers matching your search. Try adjusting your filters.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Player Details Slide-Out Panel */}
      {/* Backdrop - clicks close the panel, but player card clicks stop propagation */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md z-50 transform transition-transform duration-300 ease-out ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: 'hsl(220 45% 7% / 0.85)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid hsl(0 0% 100% / 0.08)',
        }}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-brand-red" />
            <h2 className="font-broadcast text-lg text-white">PLAYER DETAILS</h2>
          </div>
          <button
            onClick={closePanel}
            className="w-8 h-8 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
          {/* Show player details if we have data that matches selected player */}
          {selectedPlayer && selectedPlayer.id === selectedPlayerId ? (() => {
            const detailTier = getPlayerTier(selectedPlayer.latestSeasonStats?.hrsTotal || 0)
            const detailConfig = TIER_CONFIG[detailTier]
            return (
            <div className="space-y-4">
              {/* Player Header */}
              <div className={`relative overflow-hidden bg-surface-card border p-4 ${detailConfig.cardBorder}`}>
                {/* Tier stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${detailConfig.stripe}`} />
                <div className="flex items-center gap-4">
                  {/* Player Photo */}
                  {selectedPlayer.photoUrl ? (
                    <img
                      src={selectedPlayer.photoUrl}
                      alt={selectedPlayer.name}
                      className="w-20 h-20 object-cover bg-surface-base border border-border"
                    />
                  ) : (
                    <div className={`w-20 h-20 ${detailConfig.initialsBg} flex items-center justify-center`}>
                      <span className={`font-broadcast text-2xl ${detailConfig.initialsText}`}>
                        {getInitials(selectedPlayer.name)}
                      </span>
                    </div>
                  )}

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-broadcast text-xl text-white truncate">
                      {selectedPlayer.name.toUpperCase()}
                    </h3>
                    <p className="text-muted-foreground">{selectedPlayer.teamAbbr}</p>
                  </div>

                  {/* HR Badge */}
                  <div className="text-center">
                    <div className={`font-broadcast text-4xl ${detailConfig.hrColor}`}>
                      {selectedPlayer.latestSeasonStats?.hrsTotal || 0}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      <span className="opacity-50">&#9918;</span> {selectedPlayer.latestSeasonStats?.seasonYear || 'N/A'} HRs
                    </div>
                    {detailConfig.label && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 border mt-1 inline-block ${detailConfig.badgeBg} ${detailConfig.badgeText} ${detailConfig.badgeBorder}`}>
                        {detailConfig.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Eligibility Status */}
                <div className="bg-surface-card border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 flex items-center justify-center ${
                      selectedPlayer.latestSeasonStats?.isEligible ? 'bg-accent-green' : 'bg-rose-600'
                    }`}>
                      <Target className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                  </div>
                  <div className={`font-broadcast text-lg ${
                    selectedPlayer.latestSeasonStats?.isEligible ? 'text-accent-green' : 'text-rose-400'
                  }`}>
                    {selectedPlayer.latestSeasonStats?.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </div>
                </div>

                {/* Cap Cost */}
                <div className="bg-surface-card border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-accent-amber flex items-center justify-center">
                      <Trophy className="h-3 w-3 text-surface-base" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Cap Cost</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.latestSeasonStats?.hrsTotal || 0}
                    <span className="text-muted-foreground text-xs">/172</span>
                  </div>
                </div>

                {/* Cap Percentage */}
                <div className="bg-surface-card border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-brand-red flex items-center justify-center">
                      <TrendingUp className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Cap %</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.capPercentage}%
                  </div>
                </div>

                {/* Draft Count */}
                <div className="bg-surface-card border border-border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-white/10 flex items-center justify-center">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Drafted</span>
                  </div>
                  <div className="font-broadcast text-lg text-white">
                    {selectedPlayer.draftCount === 0 ? '-' : selectedPlayer.draftCount}
                  </div>
                </div>
              </div>

            </div>
            )
          })() : isPlayerError ? (
            /* Show error if fetch failed */
            <div className="text-center py-12">
              <p className="text-muted-foreground">Unable to load player details.</p>
            </div>
          ) : (
            /* Default: show loading spinner */
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-red" />
            </div>
          )}
        </div>
      </div>

      {/* PDF Format Selection Dialog */}
      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="bg-surface-card border-border text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-broadcast text-xl flex items-center gap-2">
              <Download className="h-5 w-5 text-brand-red" />
              DOWNLOAD PDF
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm mb-4">
            Choose a format for your player list PDF:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Compact Option */}
            <button
              onClick={downloadCompactPDF}
              className="p-4 bg-surface-base border border-border hover:border-brand-red hover:bg-white/5 transition-all text-left group"
            >
              {/* Preview - Landscape two-column */}
              <div className="aspect-[11/8.5] bg-white rounded mb-3 p-2 overflow-hidden">
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="text-center mb-1">
                    <div className="text-[6px] font-bold text-gray-800">HOME RUN DERBY 2.0</div>
                    <div className="text-[4px] text-gray-500">Eligible Players 2025</div>
                  </div>
                  {/* Two columns */}
                  <div className="flex-1 flex gap-1">
                    <div className="flex-1 space-y-[2px]">
                      <div className="h-2 bg-brand-red rounded-sm" />
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={`h-1.5 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'} rounded-sm flex`}>
                          <div className="w-2 bg-gray-300 rounded-sm mr-0.5" />
                          <div className="flex-1" />
                        </div>
                      ))}
                    </div>
                    <div className="w-[2px] bg-gray-300" />
                    <div className="flex-1 space-y-[2px]">
                      <div className="h-2 bg-brand-red rounded-sm" />
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={`h-1.5 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'} rounded-sm flex`}>
                          <div className="w-2 bg-gray-300 rounded-sm mr-0.5" />
                          <div className="flex-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="font-broadcast text-white group-hover:text-accent-amber transition-colors">
                COMPACT
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                3 pages • Landscape • Two columns
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Best for quick reference
              </p>
            </button>

            {/* Detailed Option */}
            <button
              onClick={downloadDetailedPDF}
              className="p-4 bg-surface-base border border-border hover:border-brand-red hover:bg-white/5 transition-all text-left group"
            >
              {/* Preview - Portrait single column */}
              <div className="aspect-[8.5/11] bg-white rounded mb-3 p-2 overflow-hidden mx-auto" style={{ maxHeight: '140px' }}>
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="text-center mb-1">
                    <div className="text-[6px] font-bold text-gray-800">HOME RUN DERBY 2.0</div>
                    <div className="text-[4px] text-gray-500">Eligible Players 2025</div>
                  </div>
                  {/* Single column */}
                  <div className="flex-1 space-y-[2px]">
                    <div className="h-2.5 bg-brand-red rounded-sm flex items-center px-1">
                      <div className="text-[3px] text-white font-bold"># Player Team HR Cap%</div>
                    </div>
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={`h-2 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'} rounded-sm flex items-center px-1 gap-1`}>
                        <div className="w-1.5 h-1 bg-gray-400 rounded-sm" />
                        <div className="flex-1 h-1 bg-gray-300 rounded-sm" />
                        <div className="w-3 h-1 bg-gray-300 rounded-sm" />
                        <div className="w-2 h-1 bg-gray-400 rounded-sm" />
                        <div className="w-3 h-1 bg-gray-300 rounded-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <h3 className="font-broadcast text-white group-hover:text-accent-amber transition-colors">
                DETAILED
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                9 pages • Portrait • With Cap %
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Best for in-depth research
              </p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
