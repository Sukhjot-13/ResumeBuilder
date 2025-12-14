import { NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { checkPermission } from '@/lib/accessControl';
import { logger } from '@/lib/logger';

/**
 * Retrieves a user by ID and checks if they have the required permission.
 * Returns the user if authorized, or throws an error response.
 * 
 * @param {string} userId - The user's ID from request headers.
 * @param {string} permission - The permission to check (from PERMISSIONS).
 * @returns {Promise<{user: object} | NextResponse>} - User object or 403 response.
 */
export async function requirePermission(userId, permission) {
  if (!userId) {
    logger.warn('Permission check failed: No user ID provided', { permission });
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await UserService.getUserById(userId);

  if (!user) {
    logger.warn('Permission check failed: User not found', { userId, permission });
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }

  if (!checkPermission(user, permission)) {
    logger.info('Permission denied', { userId, permission, role: user.role });
    return { 
      error: NextResponse.json(
        { error: 'Permission denied', permission }, 
        { status: 403 }
      ) 
    };
  }

  return { user };
}

/**
 * Helper to check if a requirePermission result is an error.
 * @param {object} result - Result from requirePermission.
 * @returns {boolean} - True if an error occurred.
 */
export function isPermissionError(result) {
  return !!result.error;
}
