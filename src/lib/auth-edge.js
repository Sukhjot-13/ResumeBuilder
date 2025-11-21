import { jwtVerify } from 'jose';

export async function verifyTokenEdge(token, tokenType) {
  const secret = tokenType === 'access'
    ? process.env.ACCESS_TOKEN_SECRET
    : process.env.REFRESH_TOKEN_SECRET;
  
  if (!secret) throw new Error(`Secret for ${tokenType} token is not defined.`);
  
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
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
