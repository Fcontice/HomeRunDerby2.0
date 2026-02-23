import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
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

const phaseColors: Record<SeasonPhase, string> = {
  off_season: 'bg-slate-600 text-white border-slate-500',
  registration: 'bg-emerald-600 text-white border-emerald-500',
  active: 'bg-red-600 text-white border-red-500',
  completed: 'bg-slate-700 text-slate-300 border-slate-600',
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


  return (
    <>
      <div className="bg-[#1e293b] border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Season Management
          </h2>
          <div className="flex gap-2">
            <button
              onClick={fetchSeasons}
              disabled={loading}
              className="p-2 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setNewSeasonDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Season
            </button>
          </div>
        </div>
        <div className="p-5">
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
                  className={`p-4 border ${
                    season.isCurrentSeason
                      ? 'bg-[#0f172a] border-l-4 border-l-cyan-500 border-t-white/10 border-r-white/10 border-b-white/10'
                      : 'bg-[#0f172a] border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-white font-mono">
                        {season.seasonYear}
                      </span>
                      {season.isCurrentSeason && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-600 text-white text-xs">
                          <Star className="h-3 w-3" />
                          Current
                        </span>
                      )}
                      <span className={`inline-flex px-2 py-0.5 border text-xs ${phaseColors[season.phase]}`}>
                        {phaseLabels[season.phase]}
                      </span>
                    </div>
                    {!season.isCurrentSeason && (
                      <button
                        onClick={() => handleSetCurrent(season.seasonYear)}
                        className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Set Current
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-slate-500">Registration:</span>
                      <span className="text-white ml-2">
                        {formatDate(season.registrationOpenDate)} - {formatDate(season.registrationCloseDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Season:</span>
                      <span className="text-white ml-2">
                        {formatDate(season.seasonStartDate)} - {formatDate(season.seasonEndDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Phase:</span>
                    <Select
                      value={season.phase}
                      onValueChange={(value) =>
                        handlePhaseChange(season.seasonYear, value as SeasonPhase)
                      }
                    >
                      <SelectTrigger className="w-40 bg-[#1e293b] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e293b] border-white/10">
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
        </div>
      </div>

      {/* Phase Change Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: 'phase' })}>
        <DialogContent className="bg-[#1e293b] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {confirmDialog.type === 'phase' ? 'Change Season Phase' : 'Set Current Season'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {confirmDialog.type === 'phase' ? (
                <>
                  Are you sure you want to change season {confirmDialog.seasonYear} to{' '}
                  <strong className="text-white">{confirmDialog.newPhase && phaseLabels[confirmDialog.newPhase]}</strong>?
                  {confirmDialog.newPhase === 'active' && (
                    <span className="block mt-2 text-amber-400">
                      This will lock all teams and prevent further modifications.
                    </span>
                  )}
                  {confirmDialog.newPhase === 'off_season' && (
                    <span className="block mt-2 text-amber-400">
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
              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={updating}
              className="bg-white text-[#0f172a] hover:bg-white/90"
            >
              {updating ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Season Dialog */}
      <Dialog open={newSeasonDialog} onOpenChange={setNewSeasonDialog}>
        <DialogContent className="bg-[#1e293b] border-white/10">
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
              className="mt-2 bg-[#0f172a] border-white/10 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewSeasonDialog(false)}
              disabled={updating}
              className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSeason}
              disabled={updating}
              className="bg-white text-[#0f172a] hover:bg-white/90"
            >
              {updating ? 'Creating...' : 'Create Season'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
