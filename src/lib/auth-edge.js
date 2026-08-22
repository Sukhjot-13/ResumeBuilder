import { jwtVerify } from 'jose';
import env from '@/config/env';
import { TOKEN_CONFIG } from '@/lib/constants';

export async function verifyTokenEdge(token, tokenType) {
  const secret = tokenType === 'access'
    ? env.accessTokenSecret
    : env.refreshTokenSecret;
  
  if (!secret) throw new Error(`Secret for ${tokenType} token is not defined.`);
  
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

  // Assert embedded token type matches expectation (legacy tokens w/o claim tolerated)
  const expectedType = tokenType === 'access' ? TOKEN_CONFIG.TYPE_ACCESS : TOKEN_CONFIG.TYPE_REFRESH;
  if (payload.type && payload.type !== expectedType) {
    throw new Error(`Invalid token type: expected ${expectedType}, got ${payload.type}`);
  }

  return payload;
}

export async function verifyAuthEdge(tokens) {
  const { accessToken } = tokens;

  // 1. Check for valid access token
  if (accessToken) {
    try {
      const payload = await verifyTokenEdge(accessToken, 'access');
      return { ok: true, userId: payload.userId, role: payload.role };
    } catch (error) {
      // Access token expired or invalid
    }
  }

  // If access token is invalid/missing, we cannot rotate in Edge (requires DB).
  // We return ok: false, and let the proxy handle the refresh via API call or redirect.
  return { ok: false };
}
