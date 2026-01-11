/**
 * Admin Controller
 * Handles all admin-related API requests
 */

import { Request, Response, NextFunction } from 'express'
import { compare } from 'bcrypt'
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from '../utils/errors.js'
import {
  verifyPasswordSchema,
  updateTeamPaymentStatusSchema,
  adminSendNotificationSchema,
  endSeasonSchema,
} from '../types/validation.js'
import { db } from '../services/db.js'
import { sendEmail } from '../services/emailService.js'

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const seasonYear = req.query.seasonYear
      ? parseInt(req.query.seasonYear as string)
      : new Date().getFullYear()

    // Get team counts by payment status
    const teams = await db.team.findMany({ deletedAt: null, seasonYear })

    const teamsByPaymentStatus = {
      draft: 0,
      pending: 0,
      paid: 0,
      rejected: 0,
      refunded: 0,
    }

    teams.forEach((team: any) => {
      if (teamsByPaymentStatus.hasOwnProperty(team.paymentStatus)) {
        teamsByPaymentStatus[team.paymentStatus as keyof typeof teamsByPaymentStatus]++
      }
    })

    const teamsByEntryStatus = {
      draft: 0,
      entered: 0,
      locked: 0,
    }

    teams.forEach((team: any) => {
      if (teamsByEntryStatus.hasOwnProperty(team.entryStatus)) {
        teamsByEntryStatus[team.entryStatus as keyof typeof teamsByEntryStatus]++
      }
    })

    // Get user count
    const users = await db.user.findMany({ deletedAt: null })
    const verifiedUsers = users.filter((u: any) => u.emailVerified)

    // Calculate revenue (paid teams * $100)
    const revenue = teamsByPaymentStatus.paid * 100

    res.json({
      success: true,
      data: {
        totalTeams: teams.length,
        pendingApprovals: teamsByPaymentStatus.pending,
        revenue,
        activeUsers: verifiedUsers.length,
        totalUsers: users.length,
        teamsByPaymentStatus,
        teamsByEntryStatus,
        seasonYear,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/teams
 * Get all teams with filters
 */
export async function getTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const { paymentStatus, entryStatus, seasonYear, search } = req.query

    // Build where clause
    const where: any = { deletedAt: null }
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus
    }
    if (entryStatus && entryStatus !== 'all') {
      where.entryStatus = entryStatus
    }
    if (seasonYear) {
      where.seasonYear = parseInt(seasonYear as string)
    }

    // Get teams with user and players
    const teams = await db.team.findMany(where, {
      orderBy: { createdAt: 'desc' },
    })

    // If search provided, filter by team name or username
    let filteredTeams = teams
    if (search) {
      const searchLower = (search as string).toLowerCase()
      filteredTeams = teams.filter((team: any) => {
        const nameMatch = team.name?.toLowerCase().includes(searchLower)
        const userMatch = team.user?.username?.toLowerCase().includes(searchLower) ||
                         team.user?.email?.toLowerCase().includes(searchLower)
        return nameMatch || userMatch
      })
    }

    res.json({
      success: true,
      data: filteredTeams,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/teams/:id
 * Get team details
 */
export async function getTeamDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const team = await db.team.findUnique(
      { id },
      { user: true, teamPlayers: true }
    )

    if (!team) {
      throw new NotFoundError('Team not found')
    }

    res.json({
      success: true,
      data: team,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/teams/:id/status
 * Update team payment status
 */
export async function updateTeamStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const validation = updateTeamPaymentStatusSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message)
    }

    const { paymentStatus } = validation.data

    const team = await db.team.findUnique({ id })
    if (!team) {
      throw new NotFoundError('Team not found')
    }

    // Update payment status and entry status if needed
    const updateData: any = { paymentStatus }

    // If approving (paid), also set entry status to entered
    if (paymentStatus === 'paid' && team.entryStatus === 'draft') {
      updateData.entryStatus = 'entered'
    }

    const updatedTeam = await db.team.update({ id }, updateData)

    res.json({
      success: true,
      data: updatedTeam,
      message: `Team payment status updated to ${paymentStatus}`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/users
 * Get all users with filters
 */
export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { verified, role, search } = req.query

    // Get all non-deleted users
    const allUsers = await db.user.findMany({ deletedAt: null })

    let users = allUsers

    // Filter by verified status
    if (verified === 'true') {
      users = users.filter((u: any) => u.emailVerified === true)
    } else if (verified === 'false') {
      users = users.filter((u: any) => u.emailVerified === false)
    }

    // Filter by role
    if (role && role !== 'all') {
      users = users.filter((u: any) => u.role === role)
    }

    // Filter by search
    if (search) {
      const searchLower = (search as string).toLowerCase()
      users = users.filter((u: any) =>
        u.username?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      )
    }

    // Get team counts for each user
    const usersWithTeamCount = await Promise.all(
      users.map(async (user: any) => {
        const teams = await db.team.findMany({ userId: user.id, deletedAt: null })
        const paidTeams = teams.filter((t: any) => t.paymentStatus === 'paid')
        return {
          ...user,
          teamCount: teams.length,
          paidTeamCount: paidTeams.length,
        }
      })
    )

    res.json({
      success: true,
      data: usersWithTeamCount,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/users/:id/verify
 * Manually verify user email
 */
export async function verifyUserEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const user = await db.user.findUnique({ id })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        message: 'User email is already verified',
      })
    }

    await db.user.update({ id }, { emailVerified: true })

    res.json({
      success: true,
      message: 'User email verified successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/users/:id/reset-password
 * Send password reset link to user
 */
export async function sendPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const user = await db.user.findUnique({ id })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Generate reset token (24 hour expiry)
    const crypto = await import('crypto')
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.user.update({ id }, {
      resetToken,
      resetTokenExpires: resetExpires.toISOString(),
    })

    // Import and send email
    const { sendPasswordResetEmail } = await import('../services/emailService.js')
    await sendPasswordResetEmail(user.email, user.username, resetToken)

    res.json({
      success: true,
      message: 'Password reset email sent',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/admin/users/:id
 * Soft delete user
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params

    const user = await db.user.findUnique({ id })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Check if user has paid teams
    const teams = await db.team.findMany({ userId: id, deletedAt: null })
    const paidTeams = teams.filter((t: any) => t.paymentStatus === 'paid')

    if (paidTeams.length > 0) {
      throw new ValidationError('Cannot delete user with paid teams')
    }

    await db.user.delete({ id })

    res.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/notifications
 * Send bulk email notifications
 */
export async function sendNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = adminSendNotificationSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message)
    }

    const { recipientGroup, userEmail, subject, body } = validation.data

    let recipients: any[] = []

    if (userEmail) {
      // Send to specific user
      const user = await db.user.findUnique({ email: userEmail })
      if (!user) {
        throw new NotFoundError('User not found')
      }
      recipients = [user]
    } else if (recipientGroup) {
      // Get all verified users
      const allUsers = await db.user.findMany({ deletedAt: null, emailVerified: true })

      if (recipientGroup === 'all') {
        recipients = allUsers
      } else if (recipientGroup === 'unpaid') {
        // Users with unpaid teams
        const usersWithUnpaidTeams = new Set<string>()
        for (const user of allUsers) {
          const teams = await db.team.findMany({ userId: user.id, deletedAt: null })
          const hasUnpaid = teams.some((t: any) =>
            t.paymentStatus === 'draft' || t.paymentStatus === 'pending'
          )
          if (hasUnpaid) {
            usersWithUnpaidTeams.add(user.id)
          }
        }
        recipients = allUsers.filter((u: any) => usersWithUnpaidTeams.has(u.id))
      } else if (recipientGroup === 'paid') {
        // Users with paid teams
        const usersWithPaidTeams = new Set<string>()
        for (const user of allUsers) {
          const teams = await db.team.findMany({ userId: user.id, deletedAt: null })
          const hasPaid = teams.some((t: any) => t.paymentStatus === 'paid')
          if (hasPaid) {
            usersWithPaidTeams.add(user.id)
          }
        }
        recipients = allUsers.filter((u: any) => usersWithPaidTeams.has(u.id))
      }
    }

    if (recipients.length === 0) {
      throw new ValidationError('No recipients found')
    }

    // Send emails
    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      try {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${subject}</h1>
    <p>Hi ${recipient.username},</p>
    <div>${body.replace(/\n/g, '<br>')}</div>
    <div class="footer">
      <p>Home Run Derby - hrderby.us</p>
    </div>
  </div>
</body>
</html>
        `

        await sendEmail({
          to: recipient.email,
          subject: `${subject} - Home Run Derby`,
          html,
        })
        sentCount++
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error)
        failedCount++
      }
    }

    res.json({
      success: true,
      message: `Sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      data: { sentCount, failedCount, totalRecipients: recipients.length },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/season/end
 * End the season early
 */
export async function endSeason(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = endSeasonSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message)
    }

    const { seasonYear } = validation.data

    // Lock all teams for this season
    const teams = await db.team.findMany({
      seasonYear,
      deletedAt: null,
      paymentStatus: 'paid',
    })

    let lockedCount = 0
    const now = new Date().toISOString()

    for (const team of teams) {
      if (team.entryStatus !== 'locked') {
        await db.team.update(
          { id: team.id },
          { entryStatus: 'locked', lockedAt: now }
        )
        lockedCount++
      }
    }

    res.json({
      success: true,
      message: `Season ${seasonYear} ended. Locked ${lockedCount} teams.`,
      data: { seasonYear, lockedCount },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/verify-password
 * Verify admin password for re-auth
 * OAuth users bypass password check (they authenticated via trusted provider)
 */
export async function verifyPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId

    const user = await db.user.findUnique({ id: userId })
    if (!user) {
      throw new NotFoundError('User not found')
    }

    // OAuth users bypass password verification (authenticated via Google)
    if (user.authProvider === 'google' || !user.password) {
      res.json({
        success: true,
        message: 'Identity verified via OAuth',
      })
      return
    }

    // Email/password users must verify password
    const validation = verifyPasswordSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message)
    }

    const { password } = validation.data
    const isValid = await compare(password, user.password)
    if (!isValid) {
      throw new AuthenticationError('Invalid password')
    }

    res.json({
      success: true,
      message: 'Password verified',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/admin/recipient-counts
 * Get counts for notification recipient groups
 */
export async function getRecipientCounts(req: Request, res: Response, next: NextFunction) {
  try {
    // Get all verified users
    const allUsers = await db.user.findMany({ deletedAt: null, emailVerified: true })

    let unpaidCount = 0
    let paidCount = 0

    for (const user of allUsers) {
      const teams = await db.team.findMany({ userId: user.id, deletedAt: null })
      const hasUnpaid = teams.some((t: any) =>
        t.paymentStatus === 'draft' || t.paymentStatus === 'pending'
      )
      const hasPaid = teams.some((t: any) => t.paymentStatus === 'paid')

      if (hasUnpaid) unpaidCount++
      if (hasPaid) paidCount++
    }

    res.json({
      success: true,
      data: {
        all: allUsers.length,
        unpaid: unpaidCount,
        paid: paidCount,
      },
    })
  } catch (error) {
    next(error)
  }
}
