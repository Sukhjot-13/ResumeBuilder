/**
 * Simple in-memory sliding-window rate limiter (per server instance).
 * Best-effort abuse protection for CPU/AI-heavy endpoints. For cross-instance
 * limits back this with Redis — not needed today (single deployment).
 */

const buckets = new Map(); // key -> { hits: number[], windowMs }

function prune(now) {
  if (buckets.size < 500) return;
  for (const [key, entry] of buckets) {
    const fresh = entry.hits.filter((ts) => now - ts < entry.windowMs);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else {
      entry.hits = fresh;
    }
  }
}

/**
 * @param {string} key   Unique caller key (e.g. `pdf:<userId>`)
 * @param {number} limit Max calls allowed inside the window
 * @param {number} windowMs Sliding window size in ms
 * @returns {{allowed: boolean, retryAfterMs?: number}}
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  prune(now);

  const entry = buckets.get(key);
  const hits = entry ? entry.hits.filter((ts) => now - ts < windowMs) : [];

  if (hits.length >= limit) {
    buckets.set(key, { hits, windowMs });
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - hits[0])) };
  }

  hits.push(now);
  buckets.set(key, { hits, windowMs });
  return { allowed: true };
}
