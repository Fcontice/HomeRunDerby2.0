import { useState, useEffect, useMemo } from 'react'
import { newsApi, NewsItem, NewsCategory } from '../../services/api'
import {
  Newspaper,
  Zap,
  AlertTriangle,
  ArrowRightLeft,
  ExternalLink,
} from 'lucide-react'

interface NewsBoardProps {
  userPlayerIds: string[]
}

const CATEGORY_CONFIG: Record<
  NewsCategory,
  {
    label: string
    icon: typeof Zap
    badgeClass: string
  }
> = {
  hr: {
    label: 'HOME RUN',
    icon: Zap,
    badgeClass: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  },
  injury: {
    label: 'INJURY',
    icon: AlertTriangle,
    badgeClass: 'bg-brand-red/15 text-brand-red border-brand-red/30',
  },
  trade: {
    label: 'TRANSACTION',
    icon: ArrowRightLeft,
    badgeClass: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
  },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export function NewsBoard({ userPlayerIds }: NewsBoardProps) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [date, setDate] = useState('')
  const [counts, setCounts] = useState({ hr: 0, injury: 0, trade: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<NewsCategory | 'all'>('all')

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await newsApi.getDailyNews({ limit: 50 })
        if (response.success && response.data) {
          setItems(response.data.items)
          setDate(response.data.date)
          setCounts(response.data.counts)
        }
      } catch (err) {
        console.error('Failed to fetch news:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNews()
  }, [])

  const userPlayerIdSet = useMemo(() => new Set(userPlayerIds), [userPlayerIds])

  // Filter then split: user's players first, then the rest
  const { myPlayerItems, sortedItems } = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? items
        : items.filter((i) => i.category === activeFilter)

    const mine = filtered.filter(
      (i) => i.playerId && userPlayerIdSet.has(i.playerId)
    )
    const others = filtered.filter(
      (i) => !i.playerId || !userPlayerIdSet.has(i.playerId)
    )
    return {
      myPlayerItems: mine,
      sortedItems: [...mine, ...others],
    }
  }, [items, activeFilter, userPlayerIdSet])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="card-data-table">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="h-5 w-5 bg-white/5 animate-pulse" />
          <div className="h-6 w-40 bg-white/5 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="card-data-table">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-accent-blue" />
          <h2 className="font-broadcast text-xl text-white">NEWS BOARD</h2>
        </div>
        <div className="text-center py-8 px-4">
          <div className="text-4xl mb-2">&#9918;</div>
          <p className="font-broadcast text-lg text-white/40">NO NEWS TODAY</p>
          <p className="text-sm text-muted-foreground mt-1">
            Check back tomorrow for the latest updates
          </p>
        </div>
      </div>
    )
  }

  const totalCount = counts.hr + counts.injury + counts.trade

  return (
    <div className="card-data-table">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-accent-blue" />
          <h2 className="font-broadcast text-xl text-white">NEWS BOARD</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(date)}
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex border-b border-border">
        {(
          [
            { key: 'all' as const, label: 'All', count: totalCount },
            { key: 'hr' as const, label: 'HRs', count: counts.hr },
            { key: 'injury' as const, label: 'Injuries', count: counts.injury },
            { key: 'trade' as const, label: 'Trades', count: counts.trade },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`flex-1 py-2 px-3 text-xs font-medium uppercase tracking-wider transition-colors ${
              activeFilter === tab.key
                ? 'text-white border-b-2 border-brand-red bg-white/5'
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-accent-amber">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Scrollable Feed */}
      <div className="max-h-[400px] overflow-y-auto">
        <div className="p-3 space-y-2">
          {myPlayerItems.length > 0 && (
            <div className="text-[10px] text-accent-amber uppercase tracking-widest font-medium mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-accent-amber inline-block" />
              YOUR PLAYERS
            </div>
          )}

          {sortedItems.map((item, i) => {
            const isMyPlayer =
              !!item.playerId && userPlayerIdSet.has(item.playerId)
            const config = CATEGORY_CONFIG[item.category]
            const Icon = config.icon
            const showDivider =
              myPlayerItems.length > 0 && i === myPlayerItems.length

            return (
              <div key={item.id}>
                {showDivider && (
                  <div className="border-t border-dashed border-border my-3" />
                )}
                <div
                  className={`p-3 transition-colors opacity-0 animate-fade-up ${
                    isMyPlayer
                      ? 'bg-accent-amber/5 border border-accent-amber/20 glow-amber'
                      : 'bg-white/[0.02] border border-border hover:bg-white/5'
                  }`}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    animationFillMode: 'forwards',
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Category Badge */}
                    <div
                      className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider border ${config.badgeClass}`}
                    >
                      <Icon className="h-3 w-3 inline mr-0.5 -mt-px" />
                      {config.label}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium leading-snug">
                        {item.headline}
                      </p>
                      {item.teamAbbr && (
                        <span className="text-xs text-muted-foreground">
                          {item.teamAbbr}
                        </span>
                      )}
                    </div>

                    {/* Source link */}
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1 text-muted-foreground hover:text-white transition-colors"
                        title={item.sourceName || 'Source'}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {sortedItems.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No {activeFilter === 'all' ? '' : activeFilter} news for this day
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
