import { CookieOptions } from 'express'

/**
 * @fileoverview Cookie configuration for secure JWT-based authentication.
 *
 * Security Strategy:
 * - httpOnly cookies prevent XSS attacks (JavaScript cannot access tokens)
 * - SameSite=strict prevents CSRF attacks (cookies only sent to same site)
 * - Secure flag ensures HTTPS-only transmission in production
 * - Short-lived access tokens (15min) limit damage if compromised
 * - Long-lived refresh tokens (7 days) enable seamless re-authentication
 *
 * Cookie Flow:
 * 1. Login: Server sets access_token, refresh_token, and XSRF-TOKEN cookies
 * 2. Requests: Browser auto-sends cookies; frontend adds X-CSRF-Token header
 * 3. Refresh: When access token expires, POST /api/auth/refresh gets new one
 * 4. Logout: Server clears all auth cookies
 *
 * @see {@link ../middleware/auth.ts} for token extraction and validation
 * @see {@link ../middleware/csrf.ts} for CSRF protection implementation
 */

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Cookie domain for cross-subdomain sharing.
 * Leading dot allows cookies to be shared between api.hrderbyus.com and www.hrderbyus.com.
 * In development, undefined allows localhost to work without domain restrictions.
 */
const COOKIE_DOMAIN = isProduction ? '.hrderbyus.com' : undefined

/**
 * Access token expiry: 15 minutes.
 * Short-lived to limit exposure if token is compromised.
 * Frontend should refresh before expiry using the refresh token.
 */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000 // 15 minutes in ms

/**
 * Refresh token expiry: 7 days.
 * Long-lived to avoid frequent re-authentication.
 * Stored in httpOnly cookie (cannot be stolen via XSS).
 */
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

/**
 * Returns cookie options for the access token.
 *
 * Security Configuration:
 * - `httpOnly: true` - Cookie cannot be accessed by JavaScript (XSS protection).
 *   Even if an attacker injects malicious scripts, they cannot steal the token.
 * - `secure: true` (production) - Cookie only sent over HTTPS connections.
 *   Prevents token interception via man-in-the-middle attacks.
 * - `sameSite: 'strict'` - Cookie only sent to same-site requests.
 *   Blocks cross-site request forgery (CSRF) attacks.
 * - `path: '/'` - Cookie available for all routes.
 * - `domain` - Set for cross-subdomain sharing in production.
 * - `maxAge` - 15 minutes; frontend must refresh before expiry.
 *
 * @returns {CookieOptions} Express cookie options for access token
 *
 * @example
 * // Setting access token cookie after login
 * res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, getAccessTokenCookieOptions())
 */
export function getAccessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  }
}

/**
 * Returns cookie options for the refresh token.
 *
 * The refresh token has identical security settings to the access token
 * but with a longer expiry (7 days vs 15 minutes).
 *
 * Security Rationale for Long-Lived Refresh Tokens:
 * - httpOnly protection means refresh token cannot be stolen via XSS
 * - sameSite=strict prevents CSRF attacks against the refresh endpoint
 * - Only used for one purpose: obtaining new access tokens
 * - Token rotation could be added for extra security (issue new refresh token on use)
 *
 * @returns {CookieOptions} Express cookie options for refresh token
 *
 * @example
 * // Setting refresh token cookie after login
 * res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, getRefreshTokenCookieOptions())
 */
export function getRefreshTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  }
}

/**
 * Returns cookie options for the CSRF token.
 *
 * Double-Submit Cookie Pattern:
 * This implements CSRF protection by requiring that the token value
 * appears in both a cookie AND a custom header (X-CSRF-Token).
 *
 * Why httpOnly: false?
 * - The frontend JavaScript MUST be able to read this cookie
 * - It reads the cookie value and sends it in the X-CSRF-Token header
 * - An attacker's site cannot read our cookies due to Same-Origin Policy
 * - So they cannot forge the header, even if they can trigger a request
 *
 * Combined with sameSite=strict:
 * - sameSite=strict: Browser won't send cookie on cross-site requests
 * - Double-submit pattern: Requires header that attacker can't set
 * - Together: Defense in depth against CSRF attacks
 *
 * @returns {CookieOptions} Express cookie options for CSRF token
 *
 * @example
 * // Setting CSRF token cookie after login
 * res.cookie(COOKIE_NAMES.CSRF_TOKEN, csrfToken, getCSRFCookieOptions())
 *
 * @see {@link ../middleware/csrf.ts} for CSRF validation middleware
 */
export function getCSRFCookieOptions(): CookieOptions {
  return {
    httpOnly: false, // Frontend JavaScript needs to read this
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: 60 * 60 * 1000, // 1 hour
  }
}

/**
 * Returns cookie options for clearing authentication cookies.
 *
 * Important: Cookie clearing options MUST match the options used when setting,
 * otherwise the browser will not recognize which cookie to clear.
 * The only difference is omitting maxAge (not needed for clearing).
 *
 * Note: When clearing the CSRF cookie, override httpOnly to false since
 * that cookie was set with httpOnly: false.
 *
 * @returns {CookieOptions} Express cookie options for clearing cookies
 *
 * @example
 * // Clearing cookies on logout
 * res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getClearCookieOptions())
 * res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getClearCookieOptions())
 * res.clearCookie(COOKIE_NAMES.CSRF_TOKEN, { ...getClearCookieOptions(), httpOnly: false })
 */
export function getClearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    domain: COOKIE_DOMAIN,
  }
}

/**
 * Cookie names used throughout the application.
 *
 * Naming Conventions:
 * - `access_token` / `refresh_token`: Standard JWT naming
 * - `XSRF-TOKEN`: Angular convention (widely recognized by frameworks)
 *
 * Usage:
 * - Always use these constants instead of hardcoded strings
 * - Ensures consistency across auth controller, middleware, and tests
 *
 * @constant
 */
export const COOKIE_NAMES = {
  /** Short-lived JWT for API authentication (15 minutes) */
  ACCESS_TOKEN: 'access_token',
  /** Long-lived JWT for obtaining new access tokens (7 days) */
  REFRESH_TOKEN: 'refresh_token',
  /** CSRF token for double-submit cookie pattern (1 hour) */
  CSRF_TOKEN: 'XSRF-TOKEN',
} as const
