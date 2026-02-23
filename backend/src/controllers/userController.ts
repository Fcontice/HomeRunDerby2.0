import { Request, Response } from 'express'
import { db } from '../services/db.js'
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js'
import { completeProfileSchema, updateProfileSchema } from '../types/validation.js'

/**
 * Check if a username is available
 */
export async function checkUsername(req: Request, res: Response) {
  const { username } = req.params

  if (!username || username.length < 3) {
    res.json({
      success: true,
      data: { available: false, message: 'Username must be at least 3 characters' },
    })
    return
  }

  // Check format
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    res.json({
      success: true,
      data: { available: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' },
    })
    return
  }

  // Check if username exists
  const existingUser = await db.user.findFirst({ username: username.toLowerCase() })

  // If the current user is checking their own username, it's available
  const isOwnUsername = req.user && existingUser?.id === req.user.userId

  res.json({
    success: true,
    data: {
      available: !existingUser || isOwnUsername,
      message: existingUser && !isOwnUsername ? 'Username is already taken' : null,
    },
  })
}

/**
 * Complete profile for new Google OAuth users
 * Sets username and phone number, marks profile as completed
 */
export async function completeProfile(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  const { username, phoneNumber } = completeProfileSchema.parse(req.body)

  // Get current user
  const currentUser = await db.user.findUnique({ id: req.user.userId })

  if (!currentUser) {
    throw new NotFoundError('User')
  }

  // Check if profile is already completed
  if (currentUser.profileCompleted) {
    throw new ValidationError('Profile is already completed')
  }

  // Check if username is taken (case-insensitive, but not by current user)
  const existingUsername = await db.user.findFirst({ username: username.toLowerCase() })
  if (existingUsername && existingUsername.id !== currentUser.id) {
    throw new ConflictError('Username is already taken')
  }

  // Update user profile
  const updatedUser = await db.user.update(
    { id: currentUser.id },
    {
      username: username.toLowerCase(),
      phoneNumber,
      profileCompleted: true,
    }
  )

  res.json({
    success: true,
    message: 'Profile completed successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        authProvider: updatedUser.authProvider,
        emailVerified: updatedUser.emailVerified,
        phoneNumber: updatedUser.phoneNumber,
        profileCompleted: updatedUser.profileCompleted,
        createdAt: updatedUser.createdAt,
      },
    },
  })
}

/**
 * Update user profile (username, avatar)
 */
export async function updateProfile(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  const data = updateProfileSchema.parse(req.body)

  // Get current user
  const currentUser = await db.user.findUnique({ id: req.user.userId })

  if (!currentUser) {
    throw new NotFoundError('User')
  }

  // If updating username, check if it's taken
  if (data.username) {
    const existingUsername = await db.user.findFirst({ username: data.username.toLowerCase() })
    if (existingUsername && existingUsername.id !== currentUser.id) {
      throw new ConflictError('Username is already taken')
    }
  }

  // Build update object
  const updateData: Record<string, any> = {}
  if (data.username) {
    updateData.username = data.username.toLowerCase()
  }
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl
  }

  // Update user
  const updatedUser = await db.user.update(
    { id: currentUser.id },
    updateData
  )

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        authProvider: updatedUser.authProvider,
        emailVerified: updatedUser.emailVerified,
        phoneNumber: updatedUser.phoneNumber,
        profileCompleted: updatedUser.profileCompleted,
        createdAt: updatedUser.createdAt,
      },
    },
  })
}

/**
 * Delete user account (soft delete)
 */
export async function deleteAccount(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError()
  }

  // Soft delete user
  await db.user.update(
    { id: req.user.userId },
    { deletedAt: new Date().toISOString() }
  )

  res.json({
    success: true,
    message: 'Account deleted successfully',
  })
}
