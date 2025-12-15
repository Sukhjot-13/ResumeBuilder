import { ROLE_PERMISSIONS, PERMISSION_METADATA } from './constants';
import { logger } from './logger';

/**
 * Checks if a user role has a specific permission.
 * This is the ONLY way to check feature access - all features must be explicit permissions.
 * @param {number} userRole - The user's role level (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {boolean} - True if the user has the permission, false otherwise.
 */
export function hasPermission(userRole, permission) {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  const hasAccess = permissions.includes(permission);
  
  if (!hasAccess) {
    logger.debug('Permission denied', { userRole, permission });
  }
  
  return hasAccess;
}

/**
 * Checks if a user object has a specific permission.
 * This should be the primary method for checking permissions in the application.
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
 * Retrieves metadata for a specific permission/feature.
 * @param {string} permission - The permission key.
 * @returns {object|null} - Metadata object { name, description, requiredPlan } or null.
 */
export function getPermissionMetadata(permission) {
  return PERMISSION_METADATA[permission] || null;
}

