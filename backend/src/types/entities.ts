/**
 * Database Entity Types
 * TypeScript interfaces matching the Prisma schema for type safety
 */

// ==================== ENUMS ====================

export type AuthProvider = 'email' | 'google'
export type UserRole = 'user' | 'admin'
export type PaymentStatus = 'draft' | 'paid' | 'refunded'
export type EntryStatus = 'draft' | 'entered' | 'locked'
export type LeaderboardType = 'overall' | 'monthly' | 'allstar'
export type NotificationType = 'email' | 'in_app'
export type ReminderType = 'payment' | 'lock_deadline'
export type SeasonPhase = 'off_season' | 'registration' | 'active' | 'completed'

// ==================== USER ====================

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string | null
  // Some code uses 'password' as alias for passwordHash
  password?: string | null
  authProvider: AuthProvider
  emailVerified: boolean
  role: UserRole
  avatarUrl: string | null
  phoneNumber: string | null
  profileCompleted: boolean
  verificationToken: string | null
  verificationTokenExpiry: string | null
  resetToken: string | null
  resetTokenExpiry: string | null
  // Some code uses 'resetTokenExpires' as alias
  resetTokenExpires?: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // Relations (optional, populated when included)
  teams?: Team[]
  notifications?: Notification[]
  reminderLogs?: ReminderLog[]
}

// ==================== TEAM ====================

export interface Team {
  id: string
  userId: string
  name: string
  seasonYear: number
  paymentStatus: PaymentStatus
  paymentNotes: string | null
  entryStatus: EntryStatus
  totalHrs2024: number
  createdAt: string
  updatedAt: string
  lockedAt: string | null
  deletedAt: string | null
  // Relations (optional, populated when included)
  user?: User
  teamPlayers?: TeamPlayerWithPlayer[]
  leaderboards?: Leaderboard[]
}

// ==================== PLAYER ====================

export interface Player {
  id: string
  mlbId: string
  name: string
  teamAbbr: string
  photoUrl: string | null
  createdAt: string
  updatedAt: string
  // Relations (optional, populated when included)
  teamPlayers?: TeamPlayer[]
  playerStats?: PlayerStats[]
  playerSeasonStats?: PlayerSeasonStats[]
}

// ==================== TEAM PLAYER ====================

export interface TeamPlayer {
  id: string
  teamId: string
  playerId: string
  position: number
  createdAt: string
  // Relations (optional, populated when included)
  team?: Team
  player?: Player
}

// TeamPlayer with player relation populated (common pattern)
export interface TeamPlayerWithPlayer extends TeamPlayer {
  player: Player
}

// ==================== PLAYER STATS (Daily Tracking) ====================

export interface PlayerStats {
  id: string
  playerId: string
  seasonYear: number
  date: string
  hrsTotal: number
  hrsRegularSeason: number
  hrsPostseason: number
  lastUpdated: string
  // Relations (optional, populated when included)
  player?: Player
}

// ==================== PLAYER SEASON STATS (Historical Archive) ====================

export interface PlayerSeasonStats {
  id: string
  playerId: string
  seasonYear: number
  hrsTotal: number
  teamAbbr: string | null
  createdAt: string | null
  updatedAt: string | null
  // Relations (optional, populated when included)
  player?: Player
}

// ==================== LEADERBOARD ====================

export interface Leaderboard {
  id: string
  teamId: string
  leaderboardType: LeaderboardType
  month: number | null
  rank: number
  totalHrs: number
  calculatedAt: string
  seasonYear?: number
  // Relations (optional, populated when included)
  team?: Team
}

// ==================== NOTIFICATION ====================

export interface Notification {
  id: string
  userId: string | null
  type: NotificationType
  subject: string
  body: string
  sentAt: string
  readAt: string | null
  // Relations (optional, populated when included)
  user?: User
}

// ==================== REMINDER LOG ====================

export interface ReminderLog {
  id: string
  reminderType: ReminderType
  sentAt: string
  sentById: string
  recipientCount: number
  metadata: Record<string, unknown> | null
  // Relations (optional, populated when included)
  sentBy?: User
}

// ==================== SEASON CONFIG ====================

export interface SeasonConfig {
  id: string
  seasonYear: number
  phase: SeasonPhase
  registrationOpenDate: string | null
  registrationCloseDate: string | null
  seasonStartDate: string | null
  seasonEndDate: string | null
  isCurrentSeason: boolean
  lastPhaseChange: string
  changedBy: string | null
  createdAt: string
  updatedAt: string
  // Relations (optional, populated when included)
  changedByUser?: User
}

// ==================== NEWS ITEM ====================

export type NewsCategory = 'hr' | 'injury' | 'trade'

export interface NewsItem {
  id: string
  dateKey: string
  category: NewsCategory
  headline: string
  summary: string | null
  playerId: string | null
  playerName: string | null
  teamAbbr: string | null
  sourceUrl: string | null
  sourceName: string | null
  externalId: string
  metadata: Record<string, unknown> | null
  createdAt: string | null
  updatedAt: string | null
  // Relations (optional, populated when included)
  player?: Player
}

// ==================== AGGREGATE RESULT TYPES ====================

// For aggregate method results from db.ts
export interface AggregateResult {
  _count?: number
  _avg?: Record<string, number | null>
  _max?: Record<string, number | null>
  _min?: Record<string, number | null>
}

export interface GroupByResult {
  [key: string]: unknown
  _count?: number
}

// ==================== UTILITY TYPES ====================

// For db.ts update operations where partial data is allowed
export type UserUpdate = Partial<Omit<User, 'id' | 'createdAt'>>
export type TeamUpdate = Partial<Omit<Team, 'id' | 'createdAt' | 'userId'>>
export type PlayerUpdate = Partial<Omit<Player, 'id' | 'createdAt'>>

// For db.ts where clauses
export interface UserWhere {
  id?: string
  email?: string
  username?: string
  emailVerified?: boolean
  role?: UserRole
  deletedAt?: null
}

export interface TeamWhere {
  id?: string
  userId?: string
  seasonYear?: number
  paymentStatus?: PaymentStatus
  entryStatus?: EntryStatus
  deletedAt?: null
}

export interface PlayerWhere {
  id?: string
  mlbId?: string
  name?: { contains: string }
  teamAbbr?: string
  seasonYear?: number
}
