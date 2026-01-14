/**
 * Webhook Handlers
 * Process webhook events from payment providers
 */

import { db } from './db.js';
import { sendPaymentConfirmationEmail } from './emailService.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * Handle successful payment webhook
 * Updates team status and sends confirmation email
 */
export async function handlePaymentSuccess(params: {
  teamId: string;
  paymentId: string;
  amount: number;
  userEmail: string;
  userName: string;
  teamName: string;
}): Promise<void> {
  const { teamId, paymentId, amount, userEmail, userName, teamName } = params;

  // Fetch team to verify it exists
  const team = await db.team.findUnique({ id: teamId });

  if (!team) {
    throw new NotFoundError(`Team not found: ${teamId}`);
  }

  // Check if payment was already processed (idempotency)
  if (team.stripePaymentId === paymentId && team.paymentStatus === 'paid') {
    console.log(`Payment already processed for team ${teamId}, payment ${paymentId}`);
    return; // Already processed, skip
  }

  // Update team status with unique constraint protection
  try {
    await db.team.update(
      { id: teamId },
      {
        paymentStatus: 'paid',
        stripePaymentId: paymentId,
        entryStatus: 'entered',
      }
    );
  } catch (error: any) {
    // Handle unique constraint violation (duplicate payment ID)
    // PostgreSQL error code 23505 = unique_violation
    if (error.code === '23505' && error.constraint === 'Team_stripePaymentId_key') {
      console.log(`Duplicate payment detected for team ${teamId}, payment ${paymentId} - already processed`);
      return; // Idempotent: another webhook already processed this
    }
    // Re-throw other errors
    throw error;
  }

  // Send confirmation email
  try {
    await sendPaymentConfirmationEmail(
      userEmail,
      userName,
      teamName,
      amount / 100 // Convert cents to dollars
    );
  } catch (emailError) {
    // Log error but don't fail the webhook
    console.error('Failed to send payment confirmation email:', emailError);
  }

  console.log(`Payment successful for team ${teamId}: ${teamName}`);
}

/**
 * Handle failed payment webhook
 */
export async function handlePaymentFailure(params: {
  teamId: string;
  paymentId: string;
  reason?: string;
}): Promise<void> {
  const { teamId, paymentId, reason } = params;

  // Fetch team
  const team = await db.team.findUnique({ id: teamId });

  if (!team) {
    throw new NotFoundError(`Team not found: ${teamId}`);
  }

  // Update team status to reflect failure
  await db.team.update(
    { id: teamId },
    {
      paymentStatus: 'rejected',
      stripePaymentId: paymentId,
    }
  );

  console.log(`Payment failed for team ${teamId}. Reason: ${reason || 'Unknown'}`);
}

/**
 * Handle payment cancellation
 * User canceled checkout before completing payment
 */
export async function handlePaymentCancellation(params: {
  teamId: string;
  sessionId: string;
}): Promise<void> {
  const { teamId, sessionId } = params;

  console.log(`Payment canceled for team ${teamId}, session ${sessionId}`);
  // Team remains in 'draft' status, no database update needed
}
