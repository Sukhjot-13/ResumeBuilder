import dbConnect from "@/lib/mongodb";
import RefreshToken from "@/models/refreshToken";
import {
  verifyToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/utils";
import { TOKEN_CONFIG } from "@/lib/constants";
import { logger } from "@/lib/logger";

/**
 * Verifies the access token.
 * Throws an error if the token is invalid.
 * @param {string} accessToken - The access token to verify.
 * @returns {Promise<{userId: string, role: number}>} - The decoded token payload.
 */
async function verifyAccessToken(accessToken) {
  return verifyToken(accessToken, TOKEN_CONFIG.TYPE_ACCESS);
}

/**
 * Handles the logic when a token is not found or stolen.
 * @param {string} userId 
 */
async function handleStolenToken(userId) {
  logger.warn("Potential token theft detected. Deleting all refresh tokens for user.", { userId });
  await RefreshToken.deleteMany({ userId });
  throw new Error("Invalid refresh token");
}

/**
 * Verifies a refresh token, rotates it, and returns new tokens.
 * This implements secure refresh token rotation.
 * @param {string} refreshToken - The refresh token to rotate.
 * @param {object} reqInfo - Request info { ip, userAgent }.
 * @returns {Promise<{newAccessToken: string, newRefreshToken: string, userId: string}>}
 */
export async function rotateRefreshToken(refreshToken, reqInfo) {
  await dbConnect();

  // Verify the token signature and get userId
  const { userId } = await verifyToken(refreshToken, TOKEN_CONFIG.TYPE_REFRESH);

  const hashedToken = hashToken(refreshToken);
  const tokenDoc = await RefreshToken.findOne({ userId, token: hashedToken });

  // If token is not found, it might have been stolen and used.
  if (!tokenDoc) {
    await handleStolenToken(userId);
  }

  // Check if the token from the DB has expired
  if (tokenDoc.expiresAt < new Date()) {
    logger.info("Refresh token expired", { userId });
    await RefreshToken.findByIdAndDelete(tokenDoc._id);
    throw new Error("Expired refresh token");
  }

  // --- ROTATION ---
  // Delete the used token
  await RefreshToken.findByIdAndDelete(tokenDoc._id);

  // Fetch user to get current role
  const User = (await import('@/models/User')).default;
  const user = await User.findById(userId);
  if (!user) {
    logger.error("User not found during token rotation", null, { userId });
    throw new Error('User not found');
  }

  // Generate new tokens
  const newAccessToken = await generateAccessToken(userId, user.role);
  const newRefreshToken = await generateRefreshToken(userId);

  // Store the new refresh token
  const newHashedRefreshToken = hashToken(newRefreshToken);
  await RefreshToken.create({
    userId,
    token: newHashedRefreshToken,
    expiresAt: new Date(Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_MS),
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  });

  logger.info("Tokens rotated successfully", { userId });
  return { newAccessToken, newRefreshToken, userId };
}

/**
 * Main authentication verification function for middleware.
 * It verifies the access token, and if it fails, attempts to use the refresh token.
 * @param {{accessToken?: string, refreshToken?: string}} tokens - The tokens from cookies.
 * @param {object} reqInfo - Request info { ip, userAgent }.
 * @returns {Promise<{ ok: boolean, userId?: string, role?: number, newAccessToken?: string, newRefreshToken?: string, reason?: string, clearCookies?: boolean }>}
 */
export async function verifyAuth(tokens, reqInfo) {
  const { accessToken, refreshToken } = tokens;

  // 1. Check for valid access token
  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      // logger.debug("Access token is valid", { userId: payload.userId }); // Too noisy for prod?
      return { ok: true, userId: payload.userId, role: payload.role };
    } catch (error) {
      // logger.debug("Access token invalid/expired, trying refresh");
    }
  }

  // 2. Check for valid refresh token
  if (!refreshToken) {
    return { ok: false, reason: "No refresh token" };
  }

  try {
    const { newAccessToken, newRefreshToken, userId } =
      await rotateRefreshToken(refreshToken, reqInfo);
    
    // Decode new access token to get role (or we could have returned it from rotateRefreshToken)
    const { verifyToken } = await import('@/lib/utils');
    const payload = await verifyToken(newAccessToken, TOKEN_CONFIG.TYPE_ACCESS);
    
    return { ok: true, userId, role: payload.role, newAccessToken, newRefreshToken };
  } catch (error) {
    logger.error("Failed to rotate refresh token", error);
    // If refresh fails, we should clear the cookies
    return { ok: false, reason: error.message, clearCookies: true };
  }
}
