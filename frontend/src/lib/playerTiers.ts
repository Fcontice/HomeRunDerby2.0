export type PlayerTier = 'elite' | 'premium' | 'standard'

export function getPlayerTier(hrsTotal: number): PlayerTier {
  if (hrsTotal >= 40) return 'elite'
  if (hrsTotal >= 25) return 'premium'
  return 'standard'
}

export const TIER_CONFIG = {
  elite: {
    label: 'ELITE',
    stripe: 'bg-accent-amber',
    hrColor: 'text-accent-amber',
    glowClass: 'glow-amber',
    badgeBg: 'bg-accent-amber/15',
    badgeText: 'text-accent-amber',
    badgeBorder: 'border-accent-amber/40',
    // New: for Players page cards & initials
    initialsBg: 'bg-accent-amber',
    initialsText: 'text-surface-base',
    cardBorder: 'border-accent-amber/30',
    cardHoverBorder: 'hover:border-accent-amber/50',
    cardBg: 'bg-accent-amber/5',
  },
  premium: {
    label: 'PRO',
    stripe: 'bg-accent-blue',
    hrColor: 'text-accent-blue',
    glowClass: 'glow-blue',
    badgeBg: 'bg-accent-blue/15',
    badgeText: 'text-accent-blue',
    badgeBorder: 'border-accent-blue/30',
    initialsBg: 'bg-accent-blue',
    initialsText: 'text-white',
    cardBorder: 'border-accent-blue/20',
    cardHoverBorder: 'hover:border-accent-blue/40',
    cardBg: '',
  },
  standard: {
    label: null,
    stripe: 'bg-border',
    hrColor: 'text-accent-amber',
    glowClass: '',
    badgeBg: '',
    badgeText: '',
    badgeBorder: '',
    initialsBg: 'bg-brand-red',
    initialsText: 'text-white',
    cardBorder: 'border-border',
    cardHoverBorder: 'hover:border-white/20',
    cardBg: '',
  },
} as const
