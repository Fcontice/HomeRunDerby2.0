/**
 * Payment Service - Abstraction Layer
 *
 * This service provides a payment provider abstraction that allows swapping
 * Stripe for alternative payment systems (cash, check, crypto, etc.) with minimal changes.
 *
 * To swap providers:
 * 1. Implement the IPaymentProvider interface for new provider
 * 2. Update getCurrentProvider() to return new implementation
 * 3. All controller/route code remains unchanged
 */

import Stripe from 'stripe';
import { env } from '../env.js';
import { PaymentError } from '../utils/errors.js';

// ===========================
// Payment Provider Interface
// ===========================

/**
 * Abstract payment provider interface
 * Implement this interface for any payment system (Stripe, PayPal, Manual, etc.)
 */
export interface IPaymentProvider {
  /**
   * Create a checkout session/payment intent
   * @returns URL to redirect user to for payment, or sessionId for embedded checkout
   */
  createCheckoutSession(params: {
    teamId: string;
    teamName: string;
    amount: number; // in cents
    userId: string;
    userEmail: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }>;

  /**
   * Verify webhook signature to ensure request is authentic
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): any;

  /**
   * Get payment status from provider
   */
  getPaymentStatus(paymentId: string): Promise<'pending' | 'paid' | 'failed' | 'refunded'>;
}

// ===========================
// Stripe Implementation
// ===========================

class StripePaymentProvider implements IPaymentProvider {
  private stripe: Stripe;

  constructor() {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  async createCheckoutSession(params: {
    teamId: string;
    teamName: string;
    amount: number;
    userId: string;
    userEmail: string;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Home Run Derby 2026 Entry Fee',
                description: `Team: ${params.teamName}`,
              },
              unit_amount: params.amount, // amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${env.FRONTEND_URL}/dashboard?payment=success&teamId=${params.teamId}`,
        cancel_url: `${env.FRONTEND_URL}/teams/${params.teamId}/payment?canceled=true`,
        customer_email: params.userEmail,
        client_reference_id: params.teamId, // Store teamId for webhook
        metadata: {
          teamId: params.teamId,
          userId: params.userId,
          teamName: params.teamName,
        },
      });

      if (!session.url) {
        throw new PaymentError('Failed to create checkout session - no URL returned');
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Stripe error: ${error.message}`);
      }
      throw error;
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is required for webhook verification');
      }

      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new PaymentError(`Webhook signature verification failed: ${error.message}`);
      }
      throw new PaymentError('Webhook signature verification failed');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<'pending' | 'paid' | 'failed' | 'refunded'> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(paymentId);

      switch (session.payment_status) {
        case 'paid':
          return 'paid';
        case 'unpaid':
          return 'pending';
        case 'no_payment_required':
          return 'paid';
        default:
          return 'failed';
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new PaymentError(`Failed to get payment status: ${error.message}`);
      }
      throw error;
    }
  }
}

// ===========================
// Provider Factory
// ===========================

let currentProvider: IPaymentProvider | null = null;

/**
 * Get current payment provider instance
 * Modify this function to switch payment providers
 */
export function getCurrentProvider(): IPaymentProvider {
  if (!currentProvider) {
    // Currently using Stripe
    // To swap: return new ManualPaymentProvider() or new CryptoPaymentProvider()
    currentProvider = new StripePaymentProvider();
  }
  return currentProvider;
}

// ===========================
// Public API (Provider-Agnostic)
// ===========================

/**
 * Create a checkout session for team payment
 * Works with any payment provider
 */
export async function createTeamCheckoutSession(params: {
  teamId: string;
  teamName: string;
  amount: number;
  userId: string;
  userEmail: string;
}) {
  const provider = getCurrentProvider();
  return provider.createCheckoutSession(params);
}

/**
 * Verify webhook signature
 * Works with any payment provider
 */
export function verifyPaymentWebhook(payload: string | Buffer, signature: string) {
  const provider = getCurrentProvider();
  return provider.verifyWebhookSignature(payload, signature);
}

/**
 * Get payment status
 * Works with any payment provider
 */
export async function getPaymentStatus(paymentId: string) {
  const provider = getCurrentProvider();
  return provider.getPaymentStatus(paymentId);
}

/**
 * Constants
 */
export const TEAM_ENTRY_FEE = 10000; // $100.00 in cents
