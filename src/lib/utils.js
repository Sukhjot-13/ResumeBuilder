import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { TOKEN_CONFIG } from '@/lib/constants';
import env from '@/config/env';

export function sha256(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

export const hashToken = sha256;



export async function generateAccessToken(userId, role) {
  const secret = new TextEncoder().encode(env.accessTokenSecret);
  return await new SignJWT({ userId: userId.toString(), role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY) // Single source of truth
    .sign(secret);
}

export async function generateRefreshToken(userId) {
  const secret = new TextEncoder().encode(env.refreshTokenSecret);
  return await new SignJWT({ userId: userId.toString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15d')
    .sign(secret);
}

export async function verifyToken(token, tokenType) {
  const secret = tokenType === 'access'
    ? env.accessTokenSecret
    : env.refreshTokenSecret;
  if (!secret) throw new Error(`Secret for ${tokenType} token is not defined.`);
  
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload;
}
