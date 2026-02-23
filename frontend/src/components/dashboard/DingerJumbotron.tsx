import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playersApi, DingerAlert } from '../../services/api'
import { Zap } from 'lucide-react'

interface DingerJumbotronProps {
  seasonYear: number
}

export function DingerJumbotron({ seasonYear }: DingerJumbotronProps) {
  const [dingers, setDingers] = useState<DingerAlert[]>([])
  const [totalHRs, setTotalHRs] = useState(0)
  const [date, setDate] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDingers = async () => {
      try {
        const response = await playersApi.getRecentHRs()
        if (response.success && response.data) {
          setDingers(response.data.dingers)
          setTotalHRs(response.data.totalHRs)
          setDate(response.data.date)
        }
      } catch (err) {
        console.error('Failed to fetch recent HRs:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDingers()
  }, [seasonYear])

  // Auto-cycle featured dinger every 4 seconds
  const cycleFeatured = useCallback(() => {
    if (dingers.length > 1) {
      setFeaturedIndex((prev) => (prev + 1) % dingers.length)
    }
  }, [dingers.length])

  useEffect(() => {
    if (dingers.length <= 1) return
    const interval = setInterval(cycleFeatured, 4000)
    return () => clearInterval(interval)
  }, [cycleFeatured, dingers.length])

  if (isLoading) {
    return (
      <div className="mb-8 jumbotron-frame p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/5" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-white/5 mb-2" />
            <div className="h-8 w-20 bg-white/5" />
          </div>
        </div>
      </div>
    )
  }

  // Empty state: no games or no HRs
  if (dingers.length === 0) {
    return (
      <div className="mb-8 jumbotron-frame p-6">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">&#9918;</div>
          <p className="font-broadcast text-xl text-white/40">NO GAMES YESTERDAY</p>
          <p className="text-sm text-muted-foreground mt-1">Check back after the next game day</p>
        </div>
      </div>
    )
  }

  const featured = dingers[featuredIndex]
  const otherDingers = dingers.filter((_, i) => i !== featuredIndex)

  // Format date for display
  const displayDate = date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) : ''

  return (
    <div className="mb-8 jumbotron-frame p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent-amber" />
          <span className="font-broadcast text-sm text-accent-amber tracking-wider">
            DINGER ALERT
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{displayDate}</span>
          <span className="font-broadcast text-sm text-accent-amber">
            {totalHRs} HR{totalHRs !== 1 ? 's' : ''} TOTAL
          </span>
        </div>
      </div>

      {/* Featured Dinger */}
      <div className="min-h-[80px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.playerId + featuredIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-4 w-full"
          >
            {/* HR Number */}
            <div className="flex-shrink-0">
              <div className="font-broadcast text-6xl text-accent-amber animate-firework-burst leading-none">
                {featured.hrsOnDate}
              </div>
              <div className="text-xs text-muted-foreground text-center mt-1">
                {featured.hrsOnDate === 1 ? 'DINGER' : 'DINGERS'}
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-broadcast text-2xl text-white truncate">
                {featured.playerName.toUpperCase()}
              </h3>
              <p className="text-sm text-muted-foreground">{featured.teamAbbr}</p>
            </div>

            {/* Season Total */}
            <div className="flex-shrink-0 text-right">
              <div className="font-broadcast text-3xl text-white">{featured.hrsTotal}</div>
              <div className="text-xs text-muted-foreground">SEASON</div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* "Also went deep" ticker */}
      {otherDingers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Also went deep</span>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
            {otherDingers.map((dinger) => (
              <div
                key={dinger.playerId}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-border text-sm"
              >
                <span className="text-white font-medium truncate max-w-[120px]">{dinger.playerName}</span>
                <span className="font-broadcast text-accent-amber">{dinger.hrsOnDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle indicators */}
      {dingers.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {dingers.map((_, i) => (
            <button
              key={i}
              onClick={() => setFeaturedIndex(i)}
              className={`w-1.5 h-1.5 transition-colors ${
                i === featuredIndex ? 'bg-accent-amber' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
