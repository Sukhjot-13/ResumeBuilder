import { ROLE_PERMISSIONS, ROLES, PERMISSIONS, PERMISSION_METADATA } from './constants';
import { logger } from './logger';

/**
 * In-memory cache for DB role permissions (cleared on server restart).
 * Maps role value -> permissions array.
 *
 * The cache doubles as the verified last-known-good policy snapshot: it is
 * only ever populated from a SUCCESSFUL database read, so a later outage can
 * fall back on it (bounded by LAST_KNOWN_GOOD_MAX_AGE_MS) without ever widening
 * access the way the compile-time constants would.
 */
let dbRoleCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute
const LAST_KNOWN_GOOD_MAX_AGE_MS = 5 * 60_000; // 5 minutes

/**
 * Drops the cached role snapshot. Called after any role/permission write so a
 * revocation takes effect on the very next permission check.
 */
export function invalidateRoleCache() {
  dbRoleCache = null;
  cacheTimestamp = 0;
}

/**
 * Loads all roles from the database into the in-memory cache.
 * Never throws and never falls back to the constants: on failure it reports
 * that the current policy is unavailable so the caller can fail closed.
 *
 * @returns {Promise<{ok: true, roles: object} | {ok: false, roles: null}>}
 */
async function loadDbRoles() {
  try {
    const { default: dbConnect } = await import('@/lib/mongodb');
    await dbConnect();
    const Role = (await import('@/models/Role')).default;
    const roles = await Role.find({}).lean();
    const snapshot = {};
    for (const role of roles) {
      snapshot[role.value] = role;
    }
    dbRoleCache = snapshot;
    cacheTimestamp = Date.now();
    return { ok: true, roles: snapshot };
  } catch (e) {
    logger.error('Role store unavailable — permission checks fail closed', e);
    return { ok: false, roles: null };
  }
}

/**
 * Resolves the authoritative permission list for a role.
 *
 * Precedence (never widens access):
 *   1. protected root ADMIN       -> system policy (independent of role rows)
 *   2. valid cache/reload         -> current DB policy
 *   3. reload fails, recent LKG   -> last verified DB snapshot
 *   4. reload fails, no/stale LKG -> null (caller denies)
 *   5. fresh store is EMPTY       -> compile-time defaults (bootstrap only:
 *                                   `node scripts/seed.mjs` has never run)
 *
 * @returns {Promise<{permissions: string[]|'ALL'|null, source: string}>}
 */
async function resolveRolePolicy(userRole) {
  if (!Number.isInteger(userRole) || userRole < 0) {
    return { permissions: null, source: 'invalid-role' };
  }

  // The authenticated user's role comes from the User document at the API
  // guard. The built-in root role cannot be disabled by missing/edited policy
  // rows, and database flags must never manufacture another root role.
  if (isRootAdmin({ role: userRole })) {
    return { permissions: 'ALL', source: 'system-root' };
  }

  const cacheIsFresh = dbRoleCache && (Date.now() - cacheTimestamp) <= CACHE_TTL_MS;
  if (!cacheIsFresh) {
    const result = await loadDbRoles();
    if (!result.ok && !dbRoleCache) {
      return { permissions: null, source: 'store-unavailable' };
    }
  }

  if (dbRoleCache) {
    const age = Date.now() - cacheTimestamp;
    if (age > CACHE_TTL_MS && age > LAST_KNOWN_GOOD_MAX_AGE_MS) {
      logger.error('Role store unavailable and last-known-good snapshot expired — denying', {
        userRole,
        ageMs: age,
      });
      return { permissions: null, source: 'stale-snapshot' };
    }
    if (Object.keys(dbRoleCache).length === 0 && age <= CACHE_TTL_MS) {
      logger.warn('Role store is empty — using compile-time defaults until seeded', { userRole });
      return { permissions: ROLE_PERMISSIONS[userRole] || null, source: 'constants-unseeded' };
    }
    const role = dbRoleCache[userRole];
    if (!role) return { permissions: null, source: 'role-not-in-store' };
    return { permissions: Array.isArray(role.permissions) ? role.permissions : [], source: 'db' };
  }

  return { permissions: null, source: 'store-unavailable' };
}


/**
 * SYNC: Checks if a user role has a specific permission using constants only.
 * This is the original synchronous function — safe for client components.
 *
 * The canonical root-Admin rule grants every registered permission.
 *
 * @param {number} userRole - The user's role level (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {boolean} - True if the user has the permission, false otherwise.
 */
export function hasPermission(userRole, permission) {
  if (!isKnownPermission(permission) || !Number.isInteger(userRole) || userRole < 0) return false;
  if (isRootAdmin({ role: userRole })) return true;
  const permissions = ROLE_PERMISSIONS[userRole];

  if (!permissions) {
    logger.debug('Permission check failed: Unknown role', { userRole, permission });
    return false;
  }

  const hasAccess = Array.isArray(permissions) && permissions.includes(permission);

  if (!hasAccess) {
    logger.debug('Permission denied (constants)', { userRole, permission });
  }

  return hasAccess;
}

/**
 * ASYNC DB-aware: Checks if a user role has a specific permission.
 * Resolves the authoritative policy from the database (cached) and FAILS
 * CLOSED for ordinary roles when that policy cannot be read — it never falls back to the broader
 * compile-time constants, because a store outage must not restore a grant
 * that an admin already revoked. Root ADMIN uses the immutable system policy.
 * Use this in server-side code (API routes, server actions).
 *
 * @param {number} userRole - The user's role level (from ROLES enum).
 * @param {string} permission - The permission to check (from PERMISSIONS enum).
 * @returns {Promise<boolean>} - True if the user has the permission, false otherwise.
 */
export async function hasPermissionDB(userRole, permission) {
  if (!isKnownPermission(permission)) {
    logger.debug('Permission check failed: Unknown or missing permission identifier');
    return false;
  }

  const { permissions, source } = await resolveRolePolicy(userRole);

  if (!permissions) {
    logger.warn('Permission denied — no authoritative policy available', {
      userRole,
      permission,
      source,
    });
    return false;
  }

  if (source === 'system-root') {
    return true;
  }

  const hasAccess = Array.isArray(permissions) && permissions.includes(permission);
  if (!hasAccess) {
    logger.debug('Permission denied (DB)', { userRole, permission, source });
  }
  return hasAccess;
}

/** Unknown permission names (including prototype keys and ALL) fail closed. */
function isKnownPermission(permission) {
  return typeof permission === 'string' && Object.hasOwn(PERMISSION_METADATA, permission);
}

/**
 * CANONICAL root-Admin rule. The single place that recognises the protected
 * ADMIN (rank 0) system role — routes and services must call this (or
 * hasPermissionDB) rather than testing `role === 0` themselves.
 *
 * @param {object} user
 * @returns {boolean}
 */
export function isRootAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN;
}

/**
 * Non-delegable permissions: root-Admin only, never assignable through the
 * role/permission CRUD surface.
 * @returns {string[]}
 */
export function getNonDelegablePermissions() {
  return Object.keys(PERMISSION_METADATA).filter(
    (permission) => PERMISSION_METADATA[permission]?.delegable === false
  );
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
 * Uses the protected root policy or authoritative DB policy for ordinary roles.
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
