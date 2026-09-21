import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { TOKEN_CONFIG } from '@/lib/constants';
import env from '@/config/env';

export function sha256(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

export const hashToken = sha256;

/**
 * SHA-256 hash returning a raw Buffer (for key derivation, encryption, etc.)
 */
export function sha256Buffer(string) {
  return crypto.createHash('sha256').update(string).digest();
}



export async function generateAccessToken(userId, role) {
  const secret = new TextEncoder().encode(env.accessTokenSecret);
  return await new SignJWT({ type: TOKEN_CONFIG.TYPE_ACCESS, userId: userId.toString(), role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY) // Single source of truth
    .sign(secret);
}

export async function generateRefreshToken(userId, expiresIn = '15d') {
  const secret = new TextEncoder().encode(env.refreshTokenSecret);
  return await new SignJWT({ type: TOKEN_CONFIG.TYPE_REFRESH, userId: userId.toString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token, tokenType) {
  const secret = tokenType === 'access'
    ? env.accessTokenSecret
    : env.refreshTokenSecret;
  if (!secret) throw new Error(`Secret for ${tokenType} token is not defined.`);

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

  // Assert the embedded token type matches what the caller expects — guards
  // against access/refresh tokens becoming interchangeable if secrets coincide.
  const expectedType = tokenType === 'access' ? TOKEN_CONFIG.TYPE_ACCESS : TOKEN_CONFIG.TYPE_REFRESH;
  if (payload.type && payload.type !== expectedType) {
    throw new Error(`Invalid token type: expected ${expectedType}, got ${payload.type}`);
  }

  return payload;
}

/**
 * Resolves the lifetime for a rotated refresh token.
 * Standard sessions get the default 15-day window; "remember this device"
 * sessions (whose stored expiry stretches beyond 15 days) carry their
 * remaining lifetime forward so rotation never shortens a granted window.
 * Pure function — unit-tested in tests/rotationLifetime.test.js.
 * @param {Date|string|number} expiresAt - Current token's stored expiry
 * @param {number} now - Current timestamp (injectable for tests)
 * @returns {{ expiresAt: Date, maxAgeSeconds: number, jwtExp: string }}
 */
export function resolveRotationLifetime(expiresAt, now = Date.now()) {
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (remainingMs > TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS) {
    const maxAgeSeconds = Math.floor(remainingMs / 1000);
    return {
      expiresAt: new Date(expiresAt),
      maxAgeSeconds,
      jwtExp: `${maxAgeSeconds}s`,
    };
  }
  return {
    expiresAt: new Date(now + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS),
    maxAgeSeconds: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS / 1000,
    jwtExp: '15d',
  };
}
