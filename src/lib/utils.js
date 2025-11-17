import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

export function sha256(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

export const hashToken = sha256;

export async function generateAccessToken(userId) {
  const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
  return await new SignJWT({ userId: userId.toString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(secret);
}

export async function generateRefreshToken(userId) {
  const secret = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET);
  return await new SignJWT({ userId: userId.toString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15d')
    .sign(secret);
}

export async function verifyToken(token, tokenType) {
  const secret = tokenType === 'access'
    ? process.env.ACCESS_TOKEN_SECRET
    : process.env.REFRESH_TOKEN_SECRET;
  if (!secret) throw new Error(`Secret for ${tokenType} token is not defined.`);
  
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload;
}
