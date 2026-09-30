import { NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { checkPermissionDB } from '@/lib/accessControl';
import { logger } from '@/lib/logger';

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/**
 * Validates the SHAPE of a Mongo ObjectId before it reaches Mongoose, so a
 * malformed id is a clean 401/400 instead of a CastError 500.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  return typeof id === 'string' && OBJECT_ID_PATTERN.test(id);
}

function unauthorized(code, message) {
  return NextResponse.json({ error: message, code }, { status: 401 });
}

/**
 * Retrieves a user by ID and checks if they have the required permission.
 * Identity comes from the verified server-side session (JWT proxy header or
 * API key) — never from a client-supplied role/permission value.
 *
 * Status codes follow AGENTS.md: 401 when identity is missing or cannot be
 * resolved, 403 when the permission check fails.
 *
 * @param {string} userId - The authenticated user's ID.
 * @param {string} permission - The permission to check (from PERMISSIONS).
 * @returns {Promise<{user: object} | {error: NextResponse}>} - User object or an error response.
 */
export async function requirePermission(userId, permission) {
  if (!userId) {
    logger.warn('Permission check failed: No user ID provided', { permission });
    return { error: unauthorized('UNAUTHENTICATED', 'Unauthorized') };
  }

  if (!isValidObjectId(userId)) {
    logger.warn('Permission check failed: Malformed user id', { permission });
    return { error: unauthorized('INVALID_IDENTITY', 'Unauthorized') };
  }

  const user = await UserService.getUserById(userId);

  if (!user) {
    logger.warn('Permission check failed: User not found', { userId, permission });
    return { error: unauthorized('IDENTITY_UNRESOLVABLE', 'Unauthorized') };
  }

  // The root policy is immutable; ordinary roles use the fail-closed DB policy.
  const permitted = await checkPermissionDB(user, permission);

  if (!permitted) {
    logger.info('Permission denied', { userId, permission, role: user.role });
    return {
      error: NextResponse.json(
        { error: 'Permission denied', code: 'PERMISSION_DENIED', permission },
        { status: 403 }
      ),
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
  return !!result?.error;
}
