import { z } from 'zod'

/**
 * Authentication validation schemas
 */

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
})

export const completeProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  phoneNumber: z
    .string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone number must be in format xxx-xxx-xxxx'),
})

/**
 * Team validation schemas
 */

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters'),
  seasonYear: z.number().int().min(2020).max(2100),
  playerIds: z
    .array(z.string().uuid())
    .length(8, 'Team must have exactly 8 players'),
})

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(1, 'Team name is required')
    .max(50, 'Team name must be at most 50 characters')
    .optional(),
  playerIds: z
    .array(z.string().uuid())
    .length(8, 'Team must have exactly 8 players')
    .optional(),
})

/**
 * Admin validation schemas
 */

export const updateTeamStatusSchema = z.object({
  paymentStatus: z.enum(['draft', 'paid', 'refunded']),
  entryStatus: z.enum(['draft', 'entered', 'locked']).optional(),
  paymentNotes: z.string().max(500).optional(),
})

export const sendNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(), // If not provided, send to all
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['email', 'in_app']),
})

/**
 * Admin validation schemas
 */

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export const updateTeamPaymentStatusSchema = z.object({
  paymentStatus: z.enum(['draft', 'paid', 'refunded']),
  paymentNotes: z.string().max(500).optional(),
})

export const adminSendNotificationSchema = z.object({
  recipientGroup: z.enum(['all', 'unpaid', 'paid']).optional(),
  userEmail: z.string().email().optional(),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required').max(10000),
})

export const lockTeamsSchema = z.object({
  confirmation: z.literal('LOCK TEAMS'),
  seasonYear: z.number().int().min(2020).max(2100),
})

export const sendPaymentReminderSchema = z.object({
  statuses: z.array(z.enum(['draft'])).min(1, 'At least one status is required'),
})

export const sendLockReminderSchema = z.object({
  lockDate: z.string().min(1, 'Lock date is required'),
})

/**
 * Payment validation schemas
 */

export const createCheckoutSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
})

/**
 * Season validation schemas
 */

export const seasonPhaseEnum = z.enum([
  'off_season',
  'registration',
  'active',
  'completed',
])

export const createSeasonSchema = z.object({
  seasonYear: z.number().int().min(2020).max(2100),
  phase: seasonPhaseEnum.optional().default('off_season'),
  registrationOpenDate: z.string().optional(),
  registrationCloseDate: z.string().optional(),
  seasonStartDate: z.string().optional(),
  seasonEndDate: z.string().optional(),
  isCurrentSeason: z.boolean().optional().default(false),
})

export const updateSeasonPhaseSchema = z.object({
  phase: seasonPhaseEnum,
})

export const updateSeasonSchema = z.object({
  registrationOpenDate: z.string().nullable().optional(),
  registrationCloseDate: z.string().nullable().optional(),
  seasonStartDate: z.string().nullable().optional(),
  seasonEndDate: z.string().nullable().optional(),
})

/**
 * Type exports for TypeScript
 */

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type UpdateTeamStatusInput = z.infer<typeof updateTeamStatusSchema>
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
export type VerifyPasswordInput = z.infer<typeof verifyPasswordSchema>
export type UpdateTeamPaymentStatusInput = z.infer<typeof updateTeamPaymentStatusSchema>
export type AdminSendNotificationInput = z.infer<typeof adminSendNotificationSchema>
export type LockTeamsInput = z.infer<typeof lockTeamsSchema>
export type SendPaymentReminderInput = z.infer<typeof sendPaymentReminderSchema>
export type SendLockReminderInput = z.infer<typeof sendLockReminderSchema>
export type SeasonPhase = z.infer<typeof seasonPhaseEnum>
export type CreateSeasonInput = z.infer<typeof createSeasonSchema>
export type UpdateSeasonPhaseInput = z.infer<typeof updateSeasonPhaseSchema>
export type UpdateSeasonInput = z.infer<typeof updateSeasonSchema>
