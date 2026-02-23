/**
 * Status Transition Validation
 * Defines valid state transitions for payment and entry statuses
 * Prevents invalid transitions like paid→draft or locked→entered
 */

import type { PaymentStatus, EntryStatus } from '../types/entities.js'
import { ValidationError } from './errors.js'

/**
 * Valid payment status transitions
 * Each key represents the current status, and the array contains valid target statuses
 */
const VALID_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  draft: ['pending', 'paid'],            // Payment initiated or admin approves directly
  pending: ['paid', 'rejected'],         // Payment processed
  paid: ['refunded'],                    // Admin can refund
  rejected: ['pending'],                 // Can resubmit
  refunded: [],                          // Terminal state
}

/**
 * Valid entry status transitions
 * Each key represents the current status, and the array contains valid target statuses
 */
const VALID_ENTRY_TRANSITIONS: Record<EntryStatus, EntryStatus[]> = {
  draft: ['entered'],                    // Team is entered after payment approval
  entered: ['locked'],                   // Team is locked (season starts or manual lock)
  locked: [],                            // Terminal state
}

/**
 * Validate if a payment status transition is allowed
 * @param currentStatus - The current payment status
 * @param newStatus - The desired new payment status
 * @returns true if the transition is valid
 */
export function isValidPaymentTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  // Same status is always valid (no-op)
  if (currentStatus === newStatus) {
    return true
  }

  const validTargets = VALID_PAYMENT_TRANSITIONS[currentStatus]
  return validTargets.includes(newStatus)
}

/**
 * Validate if an entry status transition is allowed
 * @param currentStatus - The current entry status
 * @param newStatus - The desired new entry status
 * @returns true if the transition is valid
 */
export function isValidEntryTransition(
  currentStatus: EntryStatus,
  newStatus: EntryStatus
): boolean {
  // Same status is always valid (no-op)
  if (currentStatus === newStatus) {
    return true
  }

  const validTargets = VALID_ENTRY_TRANSITIONS[currentStatus]
  return validTargets.includes(newStatus)
}

/**
 * Validate payment status transition and throw if invalid
 * @param currentStatus - The current payment status
 * @param newStatus - The desired new payment status
 * @throws ValidationError if transition is invalid
 */
export function validatePaymentTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): void {
  if (!isValidPaymentTransition(currentStatus, newStatus)) {
    const validTargets = VALID_PAYMENT_TRANSITIONS[currentStatus]
    const validTransitionsMessage = validTargets.length > 0
      ? `Valid transitions from '${currentStatus}': ${validTargets.join(', ')}`
      : `'${currentStatus}' is a terminal state with no valid transitions`

    throw new ValidationError(
      `Invalid payment status transition: '${currentStatus}' → '${newStatus}'. ${validTransitionsMessage}`
    )
  }
}

/**
 * Validate entry status transition and throw if invalid
 * @param currentStatus - The current entry status
 * @param newStatus - The desired new entry status
 * @throws ValidationError if transition is invalid
 */
export function validateEntryTransition(
  currentStatus: EntryStatus,
  newStatus: EntryStatus
): void {
  if (!isValidEntryTransition(currentStatus, newStatus)) {
    const validTargets = VALID_ENTRY_TRANSITIONS[currentStatus]
    const validTransitionsMessage = validTargets.length > 0
      ? `Valid transitions from '${currentStatus}': ${validTargets.join(', ')}`
      : `'${currentStatus}' is a terminal state with no valid transitions`

    throw new ValidationError(
      `Invalid entry status transition: '${currentStatus}' → '${newStatus}'. ${validTransitionsMessage}`
    )
  }
}

/**
 * Get all valid target statuses for a payment status
 * Useful for UI to show available actions
 */
export function getValidPaymentTargets(currentStatus: PaymentStatus): PaymentStatus[] {
  return [...VALID_PAYMENT_TRANSITIONS[currentStatus]]
}

/**
 * Get all valid target statuses for an entry status
 * Useful for UI to show available actions
 */
export function getValidEntryTargets(currentStatus: EntryStatus): EntryStatus[] {
  return [...VALID_ENTRY_TRANSITIONS[currentStatus]]
}
