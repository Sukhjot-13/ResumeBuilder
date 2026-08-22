/**
 * Plan resolver — maps a client-supplied plan identifier to a PLANS key.
 * Accepts either the KEY ('PRO') or the display name ('Pro'), case-insensitively.
 * Returns null for unknown plans.
 *
 * Extracted from /api/checkout/create-session so it can be unit tested
 * (regression guard for audit finding C1).
 */
import { PLANS } from './constants';

export function resolvePlanKey(planName) {
  const requested = typeof planName === 'string' ? planName.trim() : '';
  if (!requested) return null;
  return (
    Object.keys(PLANS).find(
      (key) =>
        key.toLowerCase() === requested.toLowerCase() ||
        PLANS[key].name.toLowerCase() === requested.toLowerCase()
    ) || null
  );
}
