/**
 * Payment Controller
 * Handles payment-related API requests
 */

import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { db } from '../services/db.js';
import { createTeamCheckoutSession, verifyPaymentWebhook, TEAM_ENTRY_FEE } from '../services/paymentService.js';
import { handlePaymentSuccess, handlePaymentFailure } from '../services/webhookHandlers.js';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  PaymentError,
} from '../utils/errors.js';

/**
 * POST /api/payments/checkout
 * Create a Stripe checkout session for team payment
 */
export async function createCheckout(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.body;
    const userId = req.user!.userId;

    if (!teamId) {
      throw new ValidationError('Team ID is required');
    }

    // Fetch team with user relation
    const team = await db.team.findUnique(
      { id: teamId },
      { user: true }
    );

    if (!team) {
      throw new NotFoundError('Team not found');
    }

    // Verify ownership
    if (team.userId !== userId) {
      throw new AuthorizationError('You can only pay for your own teams');
    }

    // Comprehensive payment status validation
    if (team.paymentStatus === 'paid') {
      throw new ValidationError('This team has already been paid for');
    }

    if (team.paymentStatus === 'pending') {
      throw new ValidationError('A payment is already being processed for this team. Please complete the existing checkout session or wait for it to expire.');
    }

    if (team.paymentStatus === 'rejected') {
      // Allow retry for rejected payments
      console.log(`Allowing payment retry for previously rejected team ${teamId}`);
    }

    if (team.paymentStatus === 'refunded') {
      // Allow new payment after refund
      console.log(`Allowing new payment for previously refunded team ${teamId}`);
    }

    // Check if team is locked (shouldn't happen, but safety check)
    if (team.entryStatus === 'locked') {
      throw new AuthorizationError('Team is locked and cannot be paid for');
    }

    // Validate team has 8 players
    const teamPlayers = await db.teamPlayer.findMany({ teamId: team.id });
    if (teamPlayers.length !== 8) {
      throw new ValidationError('Team must have exactly 8 players before payment');
    }

    // Ensure user relation is loaded
    if (!team.user) {
      throw new NotFoundError('Team user not found');
    }

    // Create checkout session
    const session = await createTeamCheckoutSession({
      teamId: team.id,
      teamName: team.name,
      amount: TEAM_ENTRY_FEE,
      userId: team.userId,
      userEmail: team.user.email,
    });

    // Update team status to pending
    await db.team.update(
      { id: teamId },
      { paymentStatus: 'pending' }
    );

    res.json({
      success: true,
      data: {
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 * This endpoint receives raw body for signature verification
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      throw new PaymentError('Missing Stripe signature header');
    }

    // Verify webhook signature and parse event
    const event = verifyPaymentWebhook(req.body, signature);

    console.log(`Webhook received: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Extract team data from metadata
        const teamId = session.metadata?.teamId || session.client_reference_id;

        if (!teamId) {
          console.error('Webhook missing teamId in metadata - ignoring event');
          res.json({ received: true }); // Always acknowledge
          return;
        }

        // Validate payment amount (security: prevent price manipulation)
        const amountPaid = session.amount_total;
        if (!amountPaid || amountPaid !== TEAM_ENTRY_FEE) {
          console.error(
            `Payment amount mismatch for team ${teamId}: expected ${TEAM_ENTRY_FEE}, got ${amountPaid} - rejecting payment`
          );
          res.json({ received: true }); // Always acknowledge but don't process
          return;
        }

        // Fetch user for email
        const team = await db.team.findUnique(
          { id: teamId },
          { user: true }
        );

        if (!team) {
          console.error(`Team not found: ${teamId} - ignoring webhook`);
          res.json({ received: true }); // Always acknowledge
          return;
        }

        if (!team.user) {
          console.error(`Team user not found: ${teamId} - ignoring webhook`);
          res.json({ received: true }); // Always acknowledge
          return;
        }

        await handlePaymentSuccess({
          teamId,
          paymentId: session.id,
          amount: amountPaid,
          userEmail: team.user.email,
          userName: team.user.username,
          teamName: team.name,
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const teamId = paymentIntent.metadata?.teamId;

        if (teamId) {
          await handlePaymentFailure({
            teamId,
            paymentId: paymentIntent.id,
            reason: paymentIntent.last_payment_error?.message,
          });
        }

        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    next(error);
  }
}
