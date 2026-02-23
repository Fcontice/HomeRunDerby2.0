/**
 * Database Service Layer using Supabase
 * Replaces Prisma operations with Supabase queries
 */

import supabaseAdmin from '../config/supabase.js'
import type {
  User,
  Team,
  Player,
  TeamPlayer,
  PlayerSeasonStats,
  PlayerStats,
  Leaderboard,
  ReminderLog,
  SeasonConfig,
  NewsItem,
  AggregateResult,
  GroupByResult,
} from '../types/entities.js'

// ==================== USER OPERATIONS ====================

export const userDb = {
  async findUnique(where: { id?: string; email?: string; username?: string }): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('User')
      .select('*')
      .match(where)
      .is('deletedAt', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data as User | null
  },

  async findFirst(where: Record<string, unknown>): Promise<User | null> {
    let query = supabaseAdmin
      .from('User')
      .select('*')
      .is('deletedAt', null)

    // Handle complex where conditions
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && value !== null && 'gt' in value) {
          query = query.gt(key, (value as { gt: unknown }).gt)
        } else if (typeof value === 'object' && value !== null && 'gte' in value) {
          query = query.gte(key, (value as { gte: unknown }).gte)
        } else if (typeof value === 'object' && value !== null && 'lt' in value) {
          query = query.lt(key, (value as { lt: unknown }).lt)
        } else if (typeof value === 'object' && value !== null && 'lte' in value) {
          query = query.lte(key, (value as { lte: unknown }).lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query.limit(1).single()

    if (error && error.code !== 'PGRST116') throw error
    return data as User | null
  },

  async create(data: Partial<User>): Promise<User> {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data as Record<string, unknown>

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: (cleanData.createdAt as string) || now,
      updatedAt: (cleanData.updatedAt as string) || now
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return user as User
  },

  async update(where: { id: string }, data: Partial<User>): Promise<User> {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (error) throw error
    return user as User
  },

  async delete(where: { id: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('User')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', where.id)

    if (error) throw error
  },

  async findMany(where: Record<string, unknown> = {}): Promise<User[]> {
    let query = supabaseAdmin
      .from('User')
      .select('*')
      .is('deletedAt', null)

    // Apply filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'deletedAt') {
        query = query.eq(key, value)
      }
    })

    const { data, error } = await query.order('createdAt', { ascending: false })

    if (error) throw error
    return (data || []) as User[]
  }
}

// ==================== PLAYER OPERATIONS ====================

export const playerDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<Player[]> {
    let query = supabaseAdmin.from('Player').select('*')

    // Apply filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && 'in' in value) {
          query = query.in(key, (value as { in: unknown[] }).in)
        } else if (typeof value === 'object' && value !== null && 'gte' in value) {
          query = query.gte(key, (value as { gte: unknown }).gte)
        } else if (typeof value === 'object' && value !== null && 'lte' in value) {
          query = query.lte(key, (value as { lte: unknown }).lte)
        } else if (typeof value === 'object' && value !== null && 'contains' in value) {
          query = query.ilike(key, `%${(value as { contains: string }).contains}%`)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take as number)
    if (options.skip) query = query.range(options.skip as number, (options.skip as number) + ((options.take as number) || 100) - 1)

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Player[]
  },

  async findUnique(where: { id: string }, include: Record<string, boolean> = {}): Promise<Player | null> {
    let selectQuery = '*'

    if (include?.teamPlayers) {
      // Include teamPlayers with their teams, including deletedAt for filtering
      selectQuery = `
        *,
        teamPlayers:TeamPlayer(
          id,
          teamId,
          position,
          team:Team(
            id,
            name,
            userId,
            deletedAt
          )
        )
      `
    }

    const { data, error } = await supabaseAdmin
      .from('Player')
      .select(selectQuery)
      .eq('id', where.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    if (!data) return null

    // Filter out teamPlayers with soft-deleted teams
    if (include?.teamPlayers) {
      const playerData = data as unknown as { teamPlayers?: Array<{ team?: { deletedAt: string | null } }> }
      if (playerData.teamPlayers) {
        playerData.teamPlayers = playerData.teamPlayers.filter(
          (tp) => tp.team?.deletedAt === null
        )
      }
    }

    return data as unknown as Player
  },

  async create(data: Partial<Player>): Promise<Player> {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data as Record<string, unknown>

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: (cleanData.createdAt as string) || now,
      updatedAt: (cleanData.updatedAt as string) || now
    }

    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return player as Player
  },

  async upsert(where: { mlbId: string }, create: Partial<Player>, update: Partial<Player>): Promise<Player> {
    // Use Supabase's native upsert with onConflict to handle race conditions atomically
    // This prevents UNIQUE constraint violations when concurrent calls occur
    const now = new Date().toISOString()

    // Merge create and update data, prioritizing update values for existing records
    // For new records, create data is used; for existing, update data takes precedence
    const upsertData = {
      ...create,
      ...update,
      mlbId: where.mlbId,
      updatedAt: now,
    }

    // Remove id from upsert data - let DB handle it for new records
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataWithoutId } = upsertData as Record<string, unknown>

    try {
      const { data: player, error } = await supabaseAdmin
        .from('Player')
        .upsert(dataWithoutId, {
          onConflict: 'mlbId',
          ignoreDuplicates: false, // Update on conflict
        })
        .select()
        .single()

      if (error) throw error
      return player as Player
    } catch (error) {
      // Handle edge case: if upsert still fails due to timing, try to fetch and update
      // This is a fallback for extremely rare race conditions
      const existing = await this.findFirst({ mlbId: where.mlbId })
      if (existing) {
        return await this.update({ id: existing.id }, update)
      }
      throw error
    }
  },

  async update(where: { id: string }, data: Partial<Player>): Promise<Player> {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: player, error } = await supabaseAdmin
      .from('Player')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (error) throw error
    return player as Player
  },

  async findFirst(where: Record<string, unknown>): Promise<Player | null> {
    const { data, error } = await supabaseAdmin
      .from('Player')
      .select('*')
      .match(where)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as Player | null
  },

  async count(where: Record<string, unknown> = {}): Promise<number> {
    let query = supabaseAdmin
      .from('Player')
      .select('*', { count: 'exact', head: true })

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value)
      }
    })

    const { count, error } = await query

    if (error) throw error
    return count || 0
  },

  async aggregate(options: {
    where?: Record<string, unknown>
    _count?: boolean
    _avg?: Record<string, boolean>
    _max?: Record<string, boolean>
    _min?: Record<string, boolean>
  }): Promise<AggregateResult> {
    const { where = {}, _count, _avg, _max, _min } = options

    let query = supabaseAdmin.from('Player').select('*')

    // Apply where filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && 'gte' in value) {
          query = query.gte(key, (value as { gte: unknown }).gte)
        } else if (typeof value === 'object' && value !== null && 'lte' in value) {
          query = query.lte(key, (value as { lte: unknown }).lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query

    if (error) throw error

    const result: AggregateResult = {}

    if (_count) {
      result._count = data.length
    }

    if (_avg) {
      result._avg = {}
      Object.keys(_avg).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._avg![field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
      })
    }

    if (_max) {
      result._max = {}
      Object.keys(_max).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._max![field] = values.length > 0 ? Math.max(...values) : null
      })
    }

    if (_min) {
      result._min = {}
      Object.keys(_min).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._min![field] = values.length > 0 ? Math.min(...values) : null
      })
    }

    return result
  },

  async groupBy(options: {
    by: string[]
    where?: Record<string, unknown>
    _count?: boolean
    orderBy?: Record<string, unknown>
  }): Promise<GroupByResult[]> {
    const { by, where = {}, orderBy } = options

    let query = supabaseAdmin.from('Player').select('*')

    // Apply where filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && 'gte' in value) {
          query = query.gte(key, (value as { gte: unknown }).gte)
        } else if (typeof value === 'object' && value !== null && 'lte' in value) {
          query = query.lte(key, (value as { lte: unknown }).lte)
        } else {
          query = query.eq(key, value)
        }
      }
    })

    const { data, error } = await query

    if (error) throw error

    // Group the data
    const groups: Record<string, Record<string, unknown>> = {}
    const groupByField = by[0] // Assuming single field grouping for now

    data.forEach(item => {
      const key = item[groupByField] as string
      if (!groups[key]) {
        groups[key] = { [groupByField]: key, _count: 0 }
      }
      ;(groups[key]._count as number)++
    })

    let result = Object.values(groups)

    // Apply ordering if specified
    if (orderBy && typeof orderBy === 'object' && '_count' in orderBy) {
      const countOrder = orderBy._count as Record<string, string>
      const direction = Object.values(countOrder)[0]

      result.sort((a, b) => {
        if (direction === 'desc') {
          return (b._count as number) - (a._count as number)
        } else {
          return (a._count as number) - (b._count as number)
        }
      })
    }

    return result
  }
}

// ==================== TEAM OPERATIONS ====================

export const teamDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<Team[]> {
    let query = supabaseAdmin.from('Team').select(`
      *,
      user:User(
      id,
      username,
      email,
      avatarUrl
    ),
      teamPlayers:TeamPlayer(
        id,
        position,
        player:Player(*)
      )
    `)

    // Filter by fields
    if (where.userId) query = query.eq('userId', where.userId as string)
    if (where.seasonYear) query = query.eq('seasonYear', where.seasonYear as number)
    if (where.paymentStatus) query = query.eq('paymentStatus', where.paymentStatus as string)
    if (where.entryStatus) query = query.eq('entryStatus', where.entryStatus as string)
    if (where.name) query = query.eq('name', where.name as string)
    if (where.id) query = query.eq('id', where.id as string)

    // Handle deletedAt filter
    if (where.deletedAt === null || where.deletedAt === undefined) {
      query = query.is('deletedAt', null)
    } else if (where.deletedAt) {
      query = query.not('deletedAt', 'is', null)
    }

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as Team[]
  },

  async findUnique(where: { id: string }, include: { user?: boolean; teamPlayers?: boolean } = {}): Promise<Team | null> {
    let selectQuery = '*'

    if (include?.teamPlayers && include?.user) {
      selectQuery = `
        *,
        user:User(
          id,
          username,
          email,
          avatarUrl
        ),
        teamPlayers:TeamPlayer(
          id,
          position,
          player:Player(*)
        )
      `
    } else if (include?.teamPlayers) {
      selectQuery = `
        *,
        teamPlayers:TeamPlayer(
          id,
          position,
          player:Player(*)
        )
      `
    } else if (include?.user) {
      selectQuery = `
        *,
        user:User(
          id,
          username,
          email,
          avatarUrl
        )
      `
    }

    const { data, error } = await supabaseAdmin
      .from('Team')
      .select(selectQuery)
      .eq('id', where.id)
      .is('deletedAt', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as Team | null
  },

  async create(data: Omit<Partial<Team>, 'teamPlayers'> & { teamPlayers?: { create: Array<{ playerId: string; position: number }> } }): Promise<Team> {
    // Separate teamPlayers from team data
    const { teamPlayers, id, ...teamData } = data as Omit<Partial<Team>, 'teamPlayers'> & { id?: string; teamPlayers?: { create: Array<{ playerId: string; position: number }> } }

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...teamData,
      createdAt: (teamData.createdAt as string) || now,
      updatedAt: (teamData.updatedAt as string) || now
    }

    // Create team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('Team')
      .insert(insertData)
      .select()
      .single()

    if (teamError) throw teamError

    // Create team players if provided - with transaction-like rollback on failure
    if (teamPlayers?.create) {
      const players = teamPlayers.create.map((tp) => {
        const tpNow = new Date().toISOString()
        return {
          teamId: team.id,
          playerId: tp.playerId,
          position: tp.position,
          createdAt: tpNow
        }
      })

      const { error: playersError } = await supabaseAdmin
        .from('TeamPlayer')
        .insert(players)

      if (playersError) {
        // Rollback: Delete the orphaned team if player insertion fails
        await supabaseAdmin
          .from('Team')
          .delete()
          .eq('id', team.id)

        throw playersError
      }
    }

    // Return team with players
    const result = await this.findUnique({ id: team.id }, { teamPlayers: true })
    return result as Team
  },

  async update(where: { id: string }, data: Partial<Team> & { teamPlayers?: { deleteMany?: object; create?: Array<{ playerId: string; position: number }> } }): Promise<Team> {
    const { teamPlayers, ...teamData } = data

    // Add updatedAt timestamp
    const updateData = {
      ...teamData,
      updatedAt: new Date().toISOString()
    }

    // Update team
    const { error: teamError } = await supabaseAdmin
      .from('Team')
      .update(updateData)
      .eq('id', where.id)
      .select()
      .single()

    if (teamError) throw teamError

    // Update team players if provided - with transaction-like rollback on failure
    if (teamPlayers) {
      // Fetch existing players before deletion (for potential rollback)
      let existingPlayers: Array<{ playerId: string; position: number; createdAt: string }> = []

      if (teamPlayers.deleteMany) {
        const { data: currentPlayers } = await supabaseAdmin
          .from('TeamPlayer')
          .select('playerId, position, createdAt')
          .eq('teamId', where.id)

        existingPlayers = (currentPlayers || []) as Array<{ playerId: string; position: number; createdAt: string }>

        // Delete existing players
        const { error: deleteError } = await supabaseAdmin
          .from('TeamPlayer')
          .delete()
          .eq('teamId', where.id)

        if (deleteError) throw deleteError
      }

      // Create new players
      if (teamPlayers.create) {
        const now = new Date().toISOString()
        const players = teamPlayers.create.map((tp) => ({
          playerId: tp.playerId,
          position: tp.position,
          teamId: where.id,
          createdAt: now
        }))

        const { error: insertError } = await supabaseAdmin
          .from('TeamPlayer')
          .insert(players)

        if (insertError) {
          // Rollback: Restore the original team players if insertion fails
          if (existingPlayers.length > 0) {
            const rollbackPlayers = existingPlayers.map((tp) => ({
              playerId: tp.playerId,
              position: tp.position,
              teamId: where.id,
              createdAt: tp.createdAt
            }))

            await supabaseAdmin
              .from('TeamPlayer')
              .insert(rollbackPlayers)
          }

          throw insertError
        }
      }
    }

    const result = await this.findUnique({ id: where.id }, { teamPlayers: true })
    return result as Team
  },

  async delete(where: { id: string }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('Team')
      .update({ deletedAt: new Date().toISOString() })
      .eq('id', where.id)

    if (error) throw error
  }
}

// ==================== PLAYER SEASON STATS OPERATIONS ====================

export const playerSeasonStatsDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<PlayerSeasonStats[]> {
    let query = supabaseAdmin.from('PlayerSeasonStats').select(`
      *,
      player:Player(
        id,
        name,
        mlbId,
        teamAbbr,
        photoUrl
      )
    `)

    // Apply filters
    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear as number)
    }
    if (where.playerId) {
      query = query.eq('playerId', where.playerId as string)
    }
    if (where.hrsTotal && typeof where.hrsTotal === 'object' && 'gte' in where.hrsTotal) {
      query = query.gte('hrsTotal', (where.hrsTotal as { gte: number }).gte)
    }

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take as number)
    if (options.skip) query = query.range(options.skip as number, (options.skip as number) + ((options.take as number) || 100) - 1)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as PlayerSeasonStats[]
  },

  async findUnique(where: { playerId: string; seasonYear: number }): Promise<PlayerSeasonStats | null> {
    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select(`
        *,
        player:Player(*)
      `)
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as PlayerSeasonStats | null
  },

  async create(data: Partial<PlayerSeasonStats>): Promise<PlayerSeasonStats> {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data as Record<string, unknown>

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: (cleanData.createdAt as string) || now,
      updatedAt: (cleanData.updatedAt as string) || now
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return stats as PlayerSeasonStats
  },

  async upsert(where: { playerId: string; seasonYear: number }, create: Partial<PlayerSeasonStats>, update: Partial<PlayerSeasonStats>): Promise<PlayerSeasonStats> {
    // Use Supabase's native upsert with onConflict to handle race conditions atomically
    // This prevents UNIQUE constraint violations when concurrent calls occur
    // The unique constraint is on (playerId, seasonYear)
    const now = new Date().toISOString()

    // Merge where, create, and update data
    const upsertData = {
      ...create,
      ...update,
      playerId: where.playerId,
      seasonYear: where.seasonYear,
      updatedAt: now,
    }

    // Remove id from upsert data - let DB handle it for new records
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataWithoutId } = upsertData as Record<string, unknown>

    try {
      const { data: stats, error } = await supabaseAdmin
        .from('PlayerSeasonStats')
        .upsert(dataWithoutId, {
          onConflict: 'playerId,seasonYear',
          ignoreDuplicates: false, // Update on conflict
        })
        .select()
        .single()

      if (error) throw error
      return stats as PlayerSeasonStats
    } catch (error) {
      // Handle edge case: if upsert still fails due to timing, try to fetch and update
      // This is a fallback for extremely rare race conditions
      const existing = await this.findUnique(where)
      if (existing) {
        return await this.update(where, update)
      }
      throw error
    }
  },

  async update(where: { playerId: string; seasonYear: number }, data: Partial<PlayerSeasonStats>): Promise<PlayerSeasonStats> {
    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .update(updateData)
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .select()
      .single()

    if (error) throw error
    return stats as PlayerSeasonStats
  },

  // Get all seasons for one player (for comparison)
  async findByPlayer(playerId: string): Promise<PlayerSeasonStats[]> {
    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select('*')
      .eq('playerId', playerId)
      .order('seasonYear', { ascending: false })

    if (error) throw error
    return (data || []) as PlayerSeasonStats[]
  },

  // Get eligible players for a specific contest year
  // e.g., getEligibleForContest(2026) returns 2025 players with ≥10 HRs
  async getEligibleForContest(contestYear: number): Promise<PlayerSeasonStats[]> {
    const previousYear = contestYear - 1

    const { data, error } = await supabaseAdmin
      .from('PlayerSeasonStats')
      .select(`
        *,
        player:Player(*)
      `)
      .eq('seasonYear', previousYear)
      .gte('hrsTotal', 10)
      .order('hrsTotal', { ascending: false })

    if (error) throw error
    return (data || []) as PlayerSeasonStats[]
  },

  async count(where: Record<string, unknown> = {}): Promise<number> {
    let query = supabaseAdmin
      .from('PlayerSeasonStats')
      .select('*', { count: 'exact', head: true })

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear as number)
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
  },

  async aggregate(options: {
    where?: Record<string, unknown>
    _count?: boolean
    _avg?: Record<string, boolean>
    _max?: Record<string, boolean>
    _min?: Record<string, boolean>
  }): Promise<AggregateResult> {
    const { where = {}, _count, _avg, _max, _min } = options

    let query = supabaseAdmin.from('PlayerSeasonStats').select('*')

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear as number)
    }

    const { data, error } = await query

    if (error) throw error

    const result: AggregateResult = {}

    if (_count) {
      result._count = data.length
    }

    if (_avg) {
      result._avg = {}
      Object.keys(_avg).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._avg![field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
      })
    }

    if (_max) {
      result._max = {}
      Object.keys(_max).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._max![field] = values.length > 0 ? Math.max(...values) : null
      })
    }

    if (_min) {
      result._min = {}
      Object.keys(_min).forEach(field => {
        const values = data.map(p => p[field]).filter((v): v is number => v != null)
        result._min![field] = values.length > 0 ? Math.min(...values) : null
      })
    }

    return result
  },

  async groupBy(options: {
    by: string[]
    where?: Record<string, unknown>
    _count?: boolean
    orderBy?: Record<string, unknown>
  }): Promise<GroupByResult[]> {
    const { by, where = {}, orderBy } = options

    let query = supabaseAdmin.from('PlayerSeasonStats').select('*')

    if (where.seasonYear !== undefined) {
      query = query.eq('seasonYear', where.seasonYear as number)
    }

    const { data, error } = await query

    if (error) throw error

    // Group the data
    const groups: Record<string, Record<string, unknown>> = {}
    const groupByField = by[0] // Assuming single field grouping

    data.forEach(item => {
      const key = item[groupByField] as string
      if (!groups[key]) {
        groups[key] = { [groupByField]: key, _count: 0 }
      }
      ;(groups[key]._count as number)++
    })

    let result = Object.values(groups)

    // Apply ordering if specified
    if (orderBy && typeof orderBy === 'object' && '_count' in orderBy) {
      const countOrder = orderBy._count as Record<string, string>
      const direction = Object.values(countOrder)[0]

      result.sort((a, b) => {
        if (direction === 'desc') {
          return (b._count as number) - (a._count as number)
        } else {
          return (a._count as number) - (b._count as number)
        }
      })
    }

    return result
  }
}

// ==================== TEAM PLAYER OPERATIONS ====================

export const teamPlayerDb = {
  /**
   * Find TeamPlayer records, filtering out those belonging to soft-deleted Teams.
   * This ensures consistency with the soft-delete pattern used across the application.
   */
  async findMany(where: Record<string, unknown> = {}): Promise<TeamPlayer[]> {
    // Include team data to filter out soft-deleted teams
    let query = supabaseAdmin.from('TeamPlayer').select(`
      *,
      team:Team!inner(
        id,
        deletedAt
      )
    `)

    // Apply filters
    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })

    // Filter out TeamPlayers whose parent Team is soft-deleted
    query = query.is('team.deletedAt', null)

    const { data, error } = await query

    if (error) throw error

    // Remove the team property from results (it was only needed for filtering)
    const results = (data || []).map(({ team, ...teamPlayer }) => teamPlayer)
    return results as TeamPlayer[]
  },

  async findUnique(where: { id: string }): Promise<TeamPlayer | null> {
    // Include team data to verify team is not soft-deleted
    const { data, error } = await supabaseAdmin
      .from('TeamPlayer')
      .select(`
        *,
        team:Team!inner(
          id,
          deletedAt
        )
      `)
      .eq('id', where.id)
      .is('team.deletedAt', null)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (!data) return null

    // Remove the team property from result
    const { team, ...teamPlayer } = data
    return teamPlayer as TeamPlayer
  },

  async create(data: Partial<TeamPlayer>): Promise<TeamPlayer> {
    // Filter out null/undefined id to let database generate it
    const { id, ...cleanData } = data as Record<string, unknown>

    // Add timestamps
    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: (cleanData.createdAt as string) || now
    }

    const { data: teamPlayer, error } = await supabaseAdmin
      .from('TeamPlayer')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return teamPlayer as TeamPlayer
  },

  async delete(where: { id: string } | { teamId: string }): Promise<void> {
    let query = supabaseAdmin.from('TeamPlayer').delete()

    if ('id' in where) {
      query = query.eq('id', where.id)
    } else if ('teamId' in where) {
      query = query.eq('teamId', where.teamId)
    }

    const { error } = await query

    if (error) throw error
  },

  /**
   * Count TeamPlayer records, excluding those belonging to soft-deleted Teams.
   */
  async count(where: Record<string, unknown> = {}): Promise<number> {
    // Include team data to filter out soft-deleted teams
    let query = supabaseAdmin
      .from('TeamPlayer')
      .select(`
        id,
        team:Team!inner(
          id,
          deletedAt
        )
      `, { count: 'exact', head: true })

    Object.entries(where).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value)
      }
    })

    // Filter out TeamPlayers whose parent Team is soft-deleted
    query = query.is('team.deletedAt', null)

    const { count, error } = await query

    if (error) throw error
    return count || 0
  }
}

// ==================== PLAYER STATS OPERATIONS ====================

export const playerStatsDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<PlayerStats[]> {
    let query = supabaseAdmin.from('PlayerStats').select('*')

    // Apply filters
    if (where.playerId) query = query.eq('playerId', where.playerId as string)
    if (where.seasonYear) query = query.eq('seasonYear', where.seasonYear as number)
    if (where.date) {
      if (typeof where.date === 'object' && where.date !== null) {
        const dateFilter = where.date as { gte?: string; lte?: string }
        if (dateFilter.gte) query = query.gte('date', dateFilter.gte)
        if (dateFilter.lte) query = query.lte('date', dateFilter.lte)
      } else {
        query = query.eq('date', where.date as string)
      }
    }

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take as number)
    if (options.skip) query = query.range(options.skip as number, (options.skip as number) + ((options.take as number) || 100) - 1)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as PlayerStats[]
  },

  async findFirst(where: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<PlayerStats | null> {
    const results = await this.findMany(where, { ...options, take: 1 })
    return results[0] || null
  },

  async findUnique(where: { playerId: string; seasonYear: number; date: string }): Promise<PlayerStats | null> {
    const { data, error } = await supabaseAdmin
      .from('PlayerStats')
      .select('*')
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .eq('date', where.date)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as PlayerStats | null
  },

  async create(data: Partial<PlayerStats>): Promise<PlayerStats> {
    const { id, ...cleanData } = data as Record<string, unknown>

    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      lastUpdated: (cleanData.lastUpdated as string) || now,
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerStats')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return stats as PlayerStats
  },

  async update(where: { playerId: string; seasonYear: number; date: string }, data: Partial<PlayerStats>): Promise<PlayerStats> {
    const updateData = {
      ...data,
      lastUpdated: new Date().toISOString(),
    }

    const { data: stats, error } = await supabaseAdmin
      .from('PlayerStats')
      .update(updateData)
      .eq('playerId', where.playerId)
      .eq('seasonYear', where.seasonYear)
      .eq('date', where.date)
      .select()
      .single()

    if (error) throw error
    return stats as PlayerStats
  },

  async upsert(
    where: { playerId: string; seasonYear: number; date: string },
    create: Partial<PlayerStats>,
    update: Partial<PlayerStats>
  ): Promise<PlayerStats> {
    // Use Supabase's native upsert with onConflict to handle race conditions atomically
    // This prevents UNIQUE constraint violations when concurrent calls occur
    // The unique constraint is on (playerId, seasonYear, date)
    const now = new Date().toISOString()

    // Merge where, create, and update data
    const upsertData = {
      ...create,
      ...update,
      playerId: where.playerId,
      seasonYear: where.seasonYear,
      date: where.date,
      lastUpdated: now,
    }

    // Remove id from upsert data - let DB handle it for new records
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataWithoutId } = upsertData as Record<string, unknown>

    try {
      const { data: stats, error } = await supabaseAdmin
        .from('PlayerStats')
        .upsert(dataWithoutId, {
          onConflict: 'playerId,seasonYear,date',
          ignoreDuplicates: false, // Update on conflict
        })
        .select()
        .single()

      if (error) throw error
      return stats as PlayerStats
    } catch (error) {
      // Handle edge case: if upsert still fails due to timing, try to fetch and update
      // This is a fallback for extremely rare race conditions
      const existing = await this.findUnique(where)
      if (existing) {
        return await this.update(where, update)
      }
      throw error
    }
  },

  // Get latest stats for a player
  async getLatest(playerId: string, seasonYear: number): Promise<PlayerStats | null> {
    return await this.findFirst(
      { playerId, seasonYear },
      { orderBy: { date: 'desc' }, take: 1 }
    )
  },
}

// ==================== LEADERBOARD OPERATIONS ====================

export const leaderboardDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<Leaderboard[]> {
    let query = supabaseAdmin.from('Leaderboard').select('*')

    // Apply filters
    if (where.teamId) query = query.eq('teamId', where.teamId as string)
    if (where.leaderboardType) query = query.eq('leaderboardType', where.leaderboardType as string)
    if (where.month !== undefined) {
      if (where.month === null) {
        query = query.is('month', null)
      } else {
        query = query.eq('month', where.month as number)
      }
    }
    if (where.seasonYear) query = query.eq('seasonYear', where.seasonYear as number)

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take as number)
    if (options.skip) query = query.range(options.skip as number, (options.skip as number) + ((options.take as number) || 100) - 1)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Leaderboard[]
  },

  async findUnique(where: { teamId: string; leaderboardType: string; month?: number | null }): Promise<Leaderboard | null> {
    let query = supabaseAdmin
      .from('Leaderboard')
      .select('*')
      .eq('teamId', where.teamId)
      .eq('leaderboardType', where.leaderboardType)

    if (where.month !== undefined) {
      if (where.month === null) {
        query = query.is('month', null)
      } else {
        query = query.eq('month', where.month)
      }
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') throw error
    return data as Leaderboard | null
  },

  async create(data: Partial<Leaderboard>): Promise<Leaderboard> {
    const { id, ...cleanData } = data as Record<string, unknown>

    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      calculatedAt: (cleanData.calculatedAt as string) || now,
    }

    const { data: leaderboard, error } = await supabaseAdmin
      .from('Leaderboard')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return leaderboard as Leaderboard
  },

  async delete(where: { teamId: string; leaderboardType: string; month?: number | null }): Promise<void> {
    let query = supabaseAdmin
      .from('Leaderboard')
      .delete()
      .eq('teamId', where.teamId)
      .eq('leaderboardType', where.leaderboardType)

    if (where.month !== undefined) {
      if (where.month === null) {
        query = query.is('month', null)
      } else {
        query = query.eq('month', where.month)
      }
    }

    const { error } = await query

    if (error) throw error
  },

  async deleteMany(where: Record<string, unknown> = {}): Promise<void> {
    let query = supabaseAdmin.from('Leaderboard').delete()

    if (where.leaderboardType) query = query.eq('leaderboardType', where.leaderboardType as string)
    if (where.seasonYear) query = query.eq('seasonYear', where.seasonYear as number)
    if (where.month !== undefined) {
      if (where.month === null) {
        query = query.is('month', null)
      } else {
        query = query.eq('month', where.month as number)
      }
    }

    const { error } = await query

    if (error) throw error
  },

  /**
   * Upsert a leaderboard entry with proper conflict handling
   * Uses the unique constraint (teamId, leaderboardType, month) for conflict resolution
   * This prevents duplicate entries from concurrent operations
   */
  async upsert(
    where: { teamId: string; leaderboardType: string; seasonYear: number; month?: number | null },
    create: Partial<Leaderboard>,
    _update: Partial<Leaderboard>
  ): Promise<{ data: Leaderboard; created: boolean }> {
    const now = new Date().toISOString()

    // Build the complete insert data
    const insertData = {
      teamId: where.teamId,
      leaderboardType: where.leaderboardType,
      seasonYear: where.seasonYear,
      month: where.month ?? null,
      ...create,
      calculatedAt: now,
    }

    // Use Supabase upsert with onConflict to handle race conditions atomically
    // The unique constraint is on (teamId, leaderboardType, month)
    const { data, error } = await supabaseAdmin
      .from('Leaderboard')
      .upsert(insertData, {
        onConflict: 'teamId,leaderboardType,month',
        ignoreDuplicates: false, // Update on conflict
      })
      .select()
      .single()

    if (error) {
      // Handle specific PostgreSQL duplicate key error (code 23505)
      // This can still happen in rare edge cases
      if (error.code === '23505') {
        // Duplicate key - fetch and return existing entry
        const existing = await this.findUnique({
          teamId: where.teamId,
          leaderboardType: where.leaderboardType,
          month: where.month,
        })
        if (existing) {
          return { data: existing, created: false }
        }
      }
      throw error
    }

    return { data: data as Leaderboard, created: true }
  },
}

// ==================== REMINDER LOG OPERATIONS ====================

export const reminderLogDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<ReminderLog[]> {
    let query = supabaseAdmin.from('ReminderLog').select(`
      *,
      sentBy:User(id, username, email)
    `)

    // Apply filters
    if (where.reminderType) query = query.eq('reminderType', where.reminderType as string)

    // Apply ordering (default: most recent first)
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    } else {
      query = query.order('sentAt', { ascending: false })
    }

    // Apply pagination
    if (options.take) query = query.limit(options.take as number)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ReminderLog[]
  },

  async findFirst(where: Record<string, unknown> = {}): Promise<ReminderLog | null> {
    const results = await this.findMany(where, { take: 1 })
    return results[0] || null
  },

  async create(data: Partial<ReminderLog>): Promise<ReminderLog> {
    const { id, ...cleanData } = data as Record<string, unknown>

    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      sentAt: (cleanData.sentAt as string) || now,
    }

    const { data: reminderLog, error } = await supabaseAdmin
      .from('ReminderLog')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return reminderLog as ReminderLog
  },

  // Get the most recent reminder of each type
  async getLatestByType(reminderType: 'payment' | 'lock_deadline'): Promise<ReminderLog | null> {
    const { data, error } = await supabaseAdmin
      .from('ReminderLog')
      .select(`
        *,
        sentBy:User(id, username, email)
      `)
      .eq('reminderType', reminderType)
      .order('sentAt', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as ReminderLog | null
  },
}

// ==================== SEASON CONFIG OPERATIONS ====================

export const seasonConfigDb = {
  async findCurrent(): Promise<SeasonConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('SeasonConfig')
      .select('*')
      .eq('isCurrentSeason', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as SeasonConfig | null
  },

  async findByYear(year: number): Promise<SeasonConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('SeasonConfig')
      .select('*')
      .eq('seasonYear', year)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as SeasonConfig | null
  },

  async findMany(): Promise<SeasonConfig[]> {
    const { data, error } = await supabaseAdmin
      .from('SeasonConfig')
      .select('*')
      .order('seasonYear', { ascending: false })

    if (error) throw error
    return (data || []) as SeasonConfig[]
  },

  async create(data: Partial<SeasonConfig>): Promise<SeasonConfig> {
    const { id, ...cleanData } = data as Record<string, unknown>

    const now = new Date().toISOString()
    const insertData = {
      ...(id ? { id } : {}),
      ...cleanData,
      createdAt: (cleanData.createdAt as string) || now,
      updatedAt: (cleanData.updatedAt as string) || now,
      lastPhaseChange: (cleanData.lastPhaseChange as string) || now,
    }

    const { data: seasonConfig, error } = await supabaseAdmin
      .from('SeasonConfig')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return seasonConfig as SeasonConfig
  },

  async updatePhase(year: number, phase: string, changedById: string): Promise<SeasonConfig> {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('SeasonConfig')
      .update({
        phase,
        lastPhaseChange: now,
        changedBy: changedById,
        updatedAt: now,
      })
      .eq('seasonYear', year)
      .select()
      .single()

    if (error) throw error
    return data as SeasonConfig
  },

  async update(year: number, data: Partial<SeasonConfig>): Promise<SeasonConfig> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const { data: updated, error } = await supabaseAdmin
      .from('SeasonConfig')
      .update(updateData)
      .eq('seasonYear', year)
      .select()
      .single()

    if (error) throw error
    return updated as SeasonConfig
  },

  async setCurrent(year: number): Promise<SeasonConfig> {
    // Clear all current flags first
    await supabaseAdmin
      .from('SeasonConfig')
      .update({ isCurrentSeason: false, updatedAt: new Date().toISOString() })
      .neq('seasonYear', 0) // Update all

    // Set target as current
    const { data, error } = await supabaseAdmin
      .from('SeasonConfig')
      .update({ isCurrentSeason: true, updatedAt: new Date().toISOString() })
      .eq('seasonYear', year)
      .select()
      .single()

    if (error) throw error
    return data as SeasonConfig
  },
}

// ==================== NEWS ITEM OPERATIONS ====================

export const newsItemDb = {
  async findMany(where: Record<string, unknown> = {}, options: Record<string, unknown> = {}): Promise<NewsItem[]> {
    let query = supabaseAdmin.from('NewsItem').select(`
      *,
      player:Player(id, name, mlbId, teamAbbr, photoUrl)
    `)

    // Apply filters
    if (where.dateKey) {
      if (typeof where.dateKey === 'object' && where.dateKey !== null) {
        const dateFilter = where.dateKey as { gte?: string; lte?: string }
        if (dateFilter.gte) query = query.gte('dateKey', dateFilter.gte)
        if (dateFilter.lte) query = query.lte('dateKey', dateFilter.lte)
      } else {
        query = query.eq('dateKey', where.dateKey as string)
      }
    }
    if (where.category) query = query.eq('category', where.category as string)
    if (where.playerId) query = query.eq('playerId', where.playerId as string)

    // Apply ordering
    if (options.orderBy) {
      const orderBy = options.orderBy as Record<string, string>
      const field = Object.keys(orderBy)[0]
      const direction = orderBy[field]
      query = query.order(field, { ascending: direction === 'asc' })
    } else {
      query = query.order('createdAt', { ascending: false })
    }

    if (options.take) query = query.limit(options.take as number)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as NewsItem[]
  },

  async bulkCreate(items: Partial<NewsItem>[]): Promise<number> {
    if (items.length === 0) return 0

    const now = new Date().toISOString()
    const rows = items.map(item => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    }))

    const { data, error } = await supabaseAdmin
      .from('NewsItem')
      .upsert(rows, {
        onConflict: 'dateKey,category,externalId',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) throw error
    return data?.length || 0
  },

  async count(where: Record<string, unknown> = {}): Promise<number> {
    let query = supabaseAdmin
      .from('NewsItem')
      .select('*', { count: 'exact', head: true })

    if (where.dateKey) query = query.eq('dateKey', where.dateKey as string)
    if (where.category) query = query.eq('category', where.category as string)

    const { count, error } = await query
    if (error) throw error
    return count || 0
  },
}

// Export a db object that mimics Prisma's structure
export const db = {
  user: userDb,
  player: playerDb,
  team: teamDb,
  teamPlayer: teamPlayerDb,
  playerSeasonStats: playerSeasonStatsDb,
  playerStats: playerStatsDb,
  leaderboard: leaderboardDb,
  reminderLog: reminderLogDb,
  seasonConfig: seasonConfigDb,
  newsItem: newsItemDb,

  // Raw query support
  async $queryRaw(query: string, ..._params: unknown[]) {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query_text: query })
    if (error) throw error
    return data
  },

  async $connect() {
    // Test connection
    const { error } = await supabaseAdmin.from('User').select('id').limit(1)
    if (error && error.code !== 'PGRST116') throw error
  },

  async $disconnect() {
    // Supabase client doesn't need explicit disconnect
  }
}

export default db
