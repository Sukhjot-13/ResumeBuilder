/**
 * csrf.js — Origin / Sec-Fetch-Site allow-list for state-changing API requests.
 *
 * Browsers always send `Sec-Fetch-Site` (and `Origin` on cross-origin and on
 * same-origin non-GET requests), so a cross-site state change can be refused
 * before it reaches a route. The check FAILS CLOSED on any mismatch.
 *
 * Allowed origins come from env.allowedOrigins (NEXT_PUBLIC_APP_URL plus the
 * ALLOWED_ORIGINS env var). SameSite=Lax cookies and the absence of any CORS
 * allow-origin header remain the primary defences; this is defence in depth.
 */

import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'none']);
// Server-to-server callers (Stripe webhooks) are not browsers and carry no
// cookies, so they are exempt — they are authenticated by signature instead.
const EXEMPT_PREFIXES = ['/api/webhooks/'];

function denial(code, message) {
  return NextResponse.json({ error: message, code }, { status: 403 });
}

/**
 * @param {string} pathname
 * @returns {boolean} - True when the route is exempt from the CSRF check.
 */
export function isCsrfExempt(pathname) {
  return EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Normalizes the configured allow-list.
 * @param {string[]} origins
 * @returns {string[]} - Unique origins without a trailing slash.
 */
export function normalizeOrigins(origins) {
  const list = Array.isArray(origins) ? origins : [];
  const output = new Set();
  for (const entry of list) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    try {
      output.add(new URL(trimmed).origin);
    } catch {
      // Ignore malformed entries rather than failing open on garbage config.
    }
  }
  return [...output];
}

/**
 * Evaluates one request. Returns null when the request may proceed, or a
 * 403 NextResponse when it must be refused.
 *
 * @param {Request} request
 * @param {object} opts
 * @param {string} opts.pathname
 * @param {string[]} opts.allowedOrigins
 * @returns {NextResponse|null}
 */
export function checkCsrfRequest(request, { pathname, allowedOrigins }) {
  const method = (request.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return null;
  if (isCsrfExempt(pathname)) return null;

  // API-key callers authenticate with a Bearer token, not cookies, so they
  // carry no ambient authority for a browser to ride on.
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) return null;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !TRUSTED_FETCH_SITES.has(fetchSite)) {
    return denial('CSRF_CROSS_SITE', 'Cross-site request blocked');
  }

  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = normalizeOrigins(allowedOrigins);
    let requestOrigin = origin;
    try {
      requestOrigin = new URL(origin).origin;
    } catch {
      return denial('CSRF_BAD_ORIGIN', 'Request origin not allowed');
    }
    if (!allowed.includes(requestOrigin)) {
      return denial('CSRF_BAD_ORIGIN', 'Request origin not allowed');
    }
  }

  // Neither header present -> not a browser request (server-side SDK, curl, the
  // proxy's own internal fetch). Nothing ambient to forge, so it proceeds.
  return null;
}
