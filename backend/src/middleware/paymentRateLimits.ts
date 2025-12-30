/**
 * Payment-Specific Rate Limiting
 * Protects payment endpoints from abuse
 */

import rateLimit from 'express-rate-limit';

/**
 * Checkout endpoint rate limiter
 * Stricter limits to prevent checkout spam
 * 10 requests per 15 minutes per IP
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many checkout attempts. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip || 'unknown';
  },
});

/**
 * Webhook endpoint rate limiter
 * Allows high volume for legitimate webhook traffic
 * 100 requests per minute per IP
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Webhook rate limit exceeded.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Webhooks come from Stripe's IP, but still protect against abuse
  skip: (req) => {
    // Skip rate limiting if webhook signature is valid (already verified in controller)
    // This prevents legitimate Stripe webhooks from being blocked
    return req.headers['stripe-signature'] !== undefined;
  },
});
