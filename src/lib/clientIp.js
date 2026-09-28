/**
 * clientIp.js — resolves the PLATFORM-provided client IP and derives
 * non-reversible rate-limit keys.
 *
 * `x-forwarded-for` is client-supplied and trivially forged, so it is never
 * used for throttling or audit records; only headers set by the hosting
 * platform's own proxy are trusted.
 */

import { sha256 } from '@/lib/utils';

const PLATFORM_IP_HEADERS = ['x-vercel-forwarded-for', 'cf-connecting-ip', 'x-real-ip'];

/**
 * @param {Request} [request]
 * @returns {string} - The client IP, or 'unknown' when the platform did not
 *   provide one.
 */
export function getClientIp(request) {
  for (const header of PLATFORM_IP_HEADERS) {
    const value = request?.headers?.get?.(header);
    if (value) return value.split(',')[0].trim();
  }
  return 'unknown';
}

/**
 * Builds the OTP resend throttle key: a hash of the platform client IP plus a
 * hash of the normalized email. Hashing keeps the raw values out of memory
 * dumps and logs.
 *
 * @param {Request} request
 * @param {string} normalizedEmail
 * @returns {string}
 */
export function buildOtpThrottleKey(request, normalizedEmail) {
  return `${sha256(getClientIp(request))}:${sha256(String(normalizedEmail).trim().toLowerCase())}`;
}
