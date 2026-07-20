import { ROLE_PERMISSIONS, ROLES, PERMISSION_METADATA } from './constants';
import { logger } from './logger';

/**
 * In-memory cache for DB role permissions (cleared on server restart).
 * Maps role value -> permissions array.
 */
let dbRoleCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Loads all roles from the database into the in-memory cache.
 * Falls back to null on DB error (callers use constants instead).
 */
async function loadDbRoles() {
  try {
    const { default: dbConnect } = await import('@/lib/mongodb');
    await dbConnect();
    const Role = (await import('@/models/Role')).default;
    const roles = await Role.find({}).lean();
    dbRoleCache = {};
    for (const role of roles) {
      dbRoleCache[role.value] = role;
    }
    cacheTimestamp = Date.now();
    return dbRoleCache;
  } catch (e) {
    // DB unavailable — fall through to constants
    return null;
  }
}

/**
 * SYNC: Checks if a user role has a specific permission using constants only.
 * This is the original synchronous function — safe for client components.
 *
 * Supports the 'ALL' wildcard for admin roles (any permission check returns true).
 *
 * @param {number} userRole - The user's role level (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {boolean} - True if the user has the permission, false otherwise.
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole];

  if (!permissions) {
    logger.debug('Permission check failed: Unknown role', { userRole, permission });
    return false;
  }

  // Admin wildcard — admins have every permission
  if (permissions === 'ALL' || (Array.isArray(permissions) && permissions[0] === 'ALL')) {
    return true;
  }

  const hasAccess = Array.isArray(permissions) && permissions.includes(permission);

  if (!hasAccess) {
    logger.debug('Permission denied (constants)', { userRole, permission });
  }

  return hasAccess;
}

/**
 * ASYNC DB-aware: Checks if a user role has a specific permission.
 * Tries the database first (with cache), falls back to constants.
 * Use this in server-side code (API routes, server actions) where DB access is available.
 *
 * @param {number} userRole - The user's role level (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {Promise<boolean>} - True if the user has the permission, false otherwise.
 */
export async function hasPermissionDB(userRole, permission) {
  // Try cache first (refresh if expired)
  if (!dbRoleCache || (Date.now() - cacheTimestamp) > CACHE_TTL_MS) {
    await loadDbRoles();
  }

  // DB hit path
  if (dbRoleCache && dbRoleCache[userRole]) {
    const role = dbRoleCache[userRole];
    if (role.isAdmin || (Array.isArray(role.permissions) && role.permissions[0] === 'ALL')) {
      return true;
    }
    const hasAccess = Array.isArray(role.permissions) && role.permissions.includes(permission);
    if (!hasAccess) {
      logger.debug('Permission denied (DB)', { userRole, permission });
    }
    return hasAccess;
  }

  // Fallback to sync constants
  return hasPermission(userRole, permission);
}

/**
 * SYNC: Checks if a user object has a specific permission using constants.
 * This is the original synchronous function — safe for client components.
 *
 * @param {object} user - The user object (must contain role).
 * @param {string} permission - The permission to check.
 * @returns {boolean} - True if allowed, false otherwise.
 */
export function checkPermission(user, permission) {
  if (!user || typeof user.role === 'undefined') {
    logger.debug('Permission check failed: User invalid or missing role', { userExists: !!user });
    return false;
  }
  return hasPermission(user.role, permission);
}

/**
 * ASYNC DB-aware: Checks if a user object has a specific permission.
 * Tries the database first (with cache), falls back to constants.
 * Use this in server-side code.
 *
 * @param {object} user - The user object (must contain role).
 * @param {string} permission - The permission to check.
 * @returns {Promise<boolean>} - True if allowed, false otherwise.
 */
export async function checkPermissionDB(user, permission) {
  if (!user || typeof user.role === 'undefined') {
    logger.debug('Permission check failed: User invalid or missing role', { userExists: !!user });
    return false;
  }
  return hasPermissionDB(user.role, permission);
}

/**
 * Retrieves metadata for a specific permission/feature.
 * @param {string} permission - The permission key.
 * @returns {object|null} - Metadata object { name, description, requiredPlan } or null.
 */
export function getPermissionMetadata(permission) {
  return PERMISSION_METADATA[permission] || null;
}
