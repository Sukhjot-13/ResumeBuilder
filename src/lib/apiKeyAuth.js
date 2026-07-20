import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { hashToken } from '@/lib/utils';
import ApiKey from '@/models/ApiKey';
import User from '@/models/User';
import DailyCount from '@/models/DailyCount';

/**
 * Validates an API key from the Authorization header.
 * If valid, returns the associated user. Otherwise returns an error response.
 *
 * Usage in a route:
 *   const auth = await authenticateRequest(request);
 *   if (auth.error) return auth.error;
 *   // auth.user is the User document
 */
export async function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'NO_API_KEY' }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const hashed = hashToken(token);

  await dbConnect();

  const apiKey = await ApiKey.findOne({ key: hashed, isActive: true });
  if (!apiKey) {
    return { error: NextResponse.json({ error: 'Invalid API key', code: 'INVALID_API_KEY' }, { status: 403 }) };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { error: NextResponse.json({ error: 'API key expired', code: 'API_KEY_EXPIRED' }, { status: 403 }) };
  }

  // Update last used
  await ApiKey.updateOne({ _id: apiKey._id }, { lastUsedAt: new Date() });

  const user = await User.findById(apiKey.userId);
  if (!user) {
    return { error: NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 }) };
  }

  return { user, apiKey };
}

/**
 * Resolves userId from either x-user-id header (JWT proxy) or API key (Worker).
 * Use this in routes that need to support BOTH auth methods.
 *
 * @param {Request} request - The incoming request
 * @param {object} [options] - Optional config
 * @param {number} [options.rateLimit] - Daily rate limit for API-key-authenticated calls
 * @returns {Promise<{userId?: string, error?: NextResponse}>}
 */
export async function resolveUserId(request, options = {}) {
  // Check API key first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = await authenticateRequest(request);
    if (auth.error) return { error: auth.error };
    // Apply rate limiting for API-key-authenticated calls
    if (options.rateLimit) {
      const rateLimitError = await checkRateLimit(auth.user._id.toString(), options.rateLimit);
      if (rateLimitError) return { error: rateLimitError.error };
    }
    return { userId: auth.user._id.toString() };
  }
  // Fallback to x-user-id header (from JWT proxy)
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'NO_AUTH' }, { status: 401 }) };
  }
  return { userId };
}

/**
 * Generates a new API key.
 * Returns { plainKey, hashedKey, keyPrefix }.
 * Store the hashed key in DB, return the plain key to the user (shown once).
 */
/**
 * Rate limiting for API key routes.
 * Checks DailyCount model for per-key usage and returns error if exceeded.
 *
 * @param {string} userId - The user's ID
 * @param {number} limit - Maximum requests per day (default 100)
 * @returns {object|null} - { error: NextResponse } if rate limited, or null if allowed
 */
export async function checkRateLimit(userId, limit = 100) {
  await dbConnect();
  const today = new Date().toISOString().slice(0, 10);

  const record = await DailyCount.findOne({ userId, date: today });
  const count = record?.count || 0;

  if (count >= limit) {
    return { error: NextResponse.json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, { status: 429 }) };
  }

  // Increment counter
  await DailyCount.findOneAndUpdate(
    { userId, date: today },
    { $inc: { count: 1 } },
    { upsert: true }
  );

  return null;
}

export function generateApiKey() {
  const plainKey = 'rb_' + crypto.randomBytes(32).toString('hex');
  const hashed = hashToken(plainKey);
  const keyPrefix = plainKey.slice(0, 8);

  return { plainKey, hashedKey: hashed, keyPrefix };
}
