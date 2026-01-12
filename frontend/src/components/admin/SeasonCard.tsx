import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { adminApi, SeasonConfig, SeasonPhase } from '../../services/api'
import { useSeason } from '../../contexts/SeasonContext'
import { Calendar, Plus, Star, RefreshCw } from 'lucide-react'

const phaseLabels: Record<SeasonPhase, string> = {
  off_season: 'Off Season',
  registration: 'Registration',
  active: 'Active',
  completed: 'Completed',
}

const phaseBadgeVariants: Record<SeasonPhase, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  off_season: 'secondary',
  registration: 'default',
  active: 'destructive',
  completed: 'outline',
}

export default function SeasonCard() {
  const { refetch: refetchCurrentSeason } = useSeason()
  const [seasons, setSeasons] = useState<SeasonConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'phase' | 'setCurrent' | 'create'
    seasonYear?: number
    newPhase?: SeasonPhase
  }>({ open: false, type: 'phase' })
  const [newSeasonDialog, setNewSeasonDialog] = useState(false)
  const [newSeasonYear, setNewSeasonYear] = useState(new Date().getFullYear() + 1)

  const fetchSeasons = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getSeasons()
      if (response.success && response.data) {
        setSeasons(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [])

  const handlePhaseChange = async (seasonYear: number, newPhase: SeasonPhase) => {
    setConfirmDialog({
      open: true,
      type: 'phase',
      seasonYear,
      newPhase,
    })
  }

  const handleSetCurrent = async (seasonYear: number) => {
    setConfirmDialog({
      open: true,
      type: 'setCurrent',
      seasonYear,
    })
  }

  const handleConfirm = async () => {
    try {
      setUpdating(true)

      if (confirmDialog.type === 'phase' && confirmDialog.seasonYear && confirmDialog.newPhase) {
        await adminApi.updateSeasonPhase(confirmDialog.seasonYear, confirmDialog.newPhase)
      } else if (confirmDialog.type === 'setCurrent' && confirmDialog.seasonYear) {
        await adminApi.setCurrentSeason(confirmDialog.seasonYear)
      }

      await fetchSeasons()
      await refetchCurrentSeason()
    } catch (error: any) {
      console.error('Failed to update season:', error)
    } finally {
      setUpdating(false)
      setConfirmDialog({ open: false, type: 'phase' })
    }
  }

  const handleCreateSeason = async () => {
    try {
      setUpdating(true)
      await adminApi.createSeason({
        seasonYear: newSeasonYear,
        phase: 'off_season',
      })
      await fetchSeasons()
      setNewSeasonDialog(false)
    } catch (error: any) {
      console.error('Failed to create season:', error)
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const currentSeason = seasons.find((s) => s.isCurrentSeason)

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Season Management
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSeasons}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setNewSeasonDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Season
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-400 text-center py-4">Loading seasons...</div>
          ) : seasons.length === 0 ? (
            <div className="text-slate-400 text-center py-4">
              No seasons configured. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className={`p-4 rounded-lg border ${
                    season.isCurrentSeason
                      ? 'bg-purple-900/20 border-purple-500'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-white">
                        {season.seasonYear}
                      </span>
                      {season.isCurrentSeason && (
                        <Badge variant="default" className="bg-purple-600">
                          <Star className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                      <Badge variant={phaseBadgeVariants[season.phase]}>
                        {phaseLabels[season.phase]}
                      </Badge>
                    </div>
                    {!season.isCurrentSeason && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetCurrent(season.seasonYear)}
                      >
                        Set Current
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-slate-400">Registration:</span>
                      <span className="text-white ml-2">
                        {formatDate(season.registrationOpenDate)} - {formatDate(season.registrationCloseDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Season:</span>
                      <span className="text-white ml-2">
                        {formatDate(season.seasonStartDate)} - {formatDate(season.seasonEndDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="text-slate-400">Phase:</Label>
                    <Select
                      value={season.phase}
                      onValueChange={(value) =>
                        handlePhaseChange(season.seasonYear, value as SeasonPhase)
                      }
                    >
                      <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off_season">Off Season</SelectItem>
                        <SelectItem value="registration">Registration</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {season.lastPhaseChange && (
                      <span className="text-xs text-slate-500">
                        Last changed: {formatDate(season.lastPhaseChange)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase Change Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: 'phase' })}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {confirmDialog.type === 'phase' ? 'Change Season Phase' : 'Set Current Season'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {confirmDialog.type === 'phase' ? (
                <>
                  Are you sure you want to change season {confirmDialog.seasonYear} to{' '}
                  <strong>{confirmDialog.newPhase && phaseLabels[confirmDialog.newPhase]}</strong>?
                  {confirmDialog.newPhase === 'active' && (
                    <span className="block mt-2 text-yellow-400">
                      This will lock all teams and prevent further modifications.
                    </span>
                  )}
                  {confirmDialog.newPhase === 'off_season' && (
                    <span className="block mt-2 text-yellow-400">
                      This will prevent team creation and payments.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Are you sure you want to set season {confirmDialog.seasonYear} as the current season?
                  This will affect which season is displayed to users.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, type: 'phase' })}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={updating}>
              {updating ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Season Dialog */}
      <Dialog open={newSeasonDialog} onOpenChange={setNewSeasonDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Season</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new season configuration. You can set dates after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="seasonYear" className="text-slate-300">
              Season Year
            </Label>
            <Input
              id="seasonYear"
              type="number"
              value={newSeasonYear}
              onChange={(e) => setNewSeasonYear(parseInt(e.target.value))}
              min={2020}
              max={2100}
              className="mt-2 bg-slate-700 border-slate-600"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewSeasonDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSeason} disabled={updating}>
              {updating ? 'Creating...' : 'Create Season'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
