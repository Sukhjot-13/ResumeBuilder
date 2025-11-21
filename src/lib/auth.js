import dbConnect from "@/lib/mongodb";
import RefreshToken from "@/models/refreshToken";
import {
  verifyToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/utils";

/**
 * Verifies the access token.
 * Throws an error if the token is invalid.
 * @param {string} accessToken - The access token to verify.
 * @returns {Promise<{userId: string}>} - The decoded token payload.
 */
async function verifyAccessToken(accessToken) {
  return verifyToken(accessToken, "access");
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
  const { userId } = await verifyToken(refreshToken, "refresh");

  const hashedToken = hashToken(refreshToken);
  const tokenDoc = await RefreshToken.findOne({ userId, token: hashedToken });

  // If token is not found, it might have been stolen and used.
  // As a security measure, we delete all refresh tokens for this user.
  if (!tokenDoc) {
    await RefreshToken.deleteMany({ userId });
    throw new Error("Invalid refresh token");
  }

  // Check if the token from the DB has expired
  if (tokenDoc.expiresAt < new Date()) {
    await RefreshToken.findByIdAndDelete(tokenDoc._id);
    throw new Error("Expired refresh token");
  }

  // --- ROTATION ---
  // Delete the used token
  await RefreshToken.findByIdAndDelete(tokenDoc._id);

  // Fetch user to get current role
  const User = (await import('@/models/User')).default;
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Generate new tokens
  const newAccessToken = await generateAccessToken(userId, user.role);
  const newRefreshToken = await generateRefreshToken(userId);

  // Store the new refresh token
  const newHashedRefreshToken = hashToken(newRefreshToken);
  await RefreshToken.create({
    userId,
    token: newHashedRefreshToken,
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    ip: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  });

  return { newAccessToken, newRefreshToken, userId };
}

/**
 * Main authentication verification function for middleware.
 * It verifies the access token, and if it fails, attempts to use the refresh token.
 * @param {{accessToken?: string, refreshToken?: string}} tokens - The tokens from cookies.
 * @param {object} reqInfo - Request info { ip, userAgent }.
 * @returns {Promise<{ ok: boolean, userId?: string, newAccessToken?: string, newRefreshToken?: string, reason?: string, clearCookies?: boolean }>}
 */
export async function verifyAuth(tokens, reqInfo) {
  const { accessToken, refreshToken } = tokens;

  // 1. Check for valid access token
  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken);
      console.log("Access token is valid");
      return { ok: true, userId: payload.userId, role: payload.role };
    } catch (error) {
      console.log(
        "Access token is invalid or expired, falling back to refresh token"
      );
    }
  }

  // 2. Check for valid refresh token
  if (!refreshToken) {
    console.log("No refresh token found");
    return { ok: false, reason: "No refresh token" };
  }

  try {
    console.log("Attempting to rotate refresh token");
    const { newAccessToken, newRefreshToken, userId } =
      await rotateRefreshToken(refreshToken, reqInfo);
    
    // We need the role here. rotateRefreshToken returns userId.
    // We can fetch user or decode the new access token.
    // Since rotateRefreshToken generates a new access token with role, let's decode it or fetch user.
    // Actually rotateRefreshToken in step 79 fetches user. 
    // But it only returns { newAccessToken, newRefreshToken, userId }.
    // Let's decode the newAccessToken to get the role.
    const { verifyToken } = await import('@/lib/utils');
    const payload = await verifyToken(newAccessToken, 'access');
    
    console.log("Successfully rotated tokens");
    return { ok: true, userId, role: payload.role, newAccessToken, newRefreshToken };
  } catch (error) {
    console.error("Failed to rotate refresh token:", error.message);
    // If refresh fails, we should clear the cookies
    return { ok: false, reason: error.message, clearCookies: true };
  }
}
