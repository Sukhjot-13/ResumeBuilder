/**
 * roleAuthorization.js — centralized guards for delegated role/user
 * administration (rank ceilings, permission ceilings, root-role protection and
 * self-escalation prevention).
 *
 * Every guard returns a plain decision object so the routes stay thin and the
 * rules can be unit-tested without an HTTP layer:
 *   { allowed: true }  |  { allowed: false, reason, code, deniedPermissions? }
 *
 * Rank convention (see src/lib/constants.js): LOWER number = HIGHER authority,
 * and 0 is the protected root ADMIN. Numeric ranks are used here ONLY for
 * administrative hierarchy boundaries — feature authorization always resolves
 * named permissions through hasPermissionDB().
 */

import { PERMISSIONS, PERMISSION_METADATA, ROLES } from '@/lib/constants';
import {
  getNonDelegablePermissions,
  hasPermissionDB,
  isRootAdmin,
} from '@/lib/accessControl';

const MAX_PERMISSIONS_PER_ROLE = 200;
const ALL_WILDCARD = 'ALL';

function deny(reason, code, extra = {}) {
  return { allowed: false, reason, code, ...extra };
}

/**
 * Root ADMIN is the permanent system authority: only the existing root Admin
 * may write the root role, and it can never be created, cloned or renamed into
 * through ordinary CRUD.
 *
 * @param {number} roleValue
 * @returns {object} decision
 */
export function evaluateRootRoleWrite(roleValue) {
  if (roleValue === ROLES.ADMIN) {
    return deny(
      'The root ADMIN role is protected and cannot be modified through this endpoint.',
      'ROOT_ROLE_PROTECTED'
    );
  }
  return { allowed: true };
}

/**
 * Rank ceiling: except root ADMIN, a caller may never manage a role or user
 * whose rank is LOWER (higher authority) than the caller's own, and may never
 * assign a rank above their own.
 *
 * @param {object} actor - The acting user document
 * @param {number} targetRank - Rank of the role/user being managed
 * @param {object} [opts]
 * @param {number} [opts.newRank] - Rank the caller wants to assign, if any
 * @returns {object} decision
 */
export function evaluateRankCeiling(actor, targetRank, opts = {}) {
  if (isRootAdmin(actor)) return { allowed: true };

  const callerRank = actor?.role;
  if (!Number.isInteger(callerRank)) {
    return deny('Caller role is unknown — refusing to manage roles.', 'CALLER_RANK_UNKNOWN');
  }

  if (Number.isInteger(targetRank) && targetRank < callerRank) {
    return deny(
      'You cannot manage a role or user with higher authority than your own.',
      'RANK_CEILING_EXCEEDED'
    );
  }

  if (Number.isInteger(opts.newRank) && opts.newRank < callerRank) {
    return deny(
      'You cannot assign a role with higher authority than your own.',
      'RANK_ASSIGNMENT_EXCEEDED'
    );
  }

  return { allowed: true };
}

/**
 * Self-escalation guard. Mirrors (and replaces) the old self-demotion-only
 * block: an admin may never change their OWN account's role, in either
 * direction, so neither promotion to root nor demotion is possible.
 *
 * @param {object} opts
 * @param {string} opts.actorId - The acting user id
 * @param {string} opts.targetId - Account being modified
 * @param {number} [opts.newRank] - Rank being written
 * @param {number} [opts.currentRank] - The caller's own current rank
 * @returns {object} decision
 */
export function evaluateSelfChange({ actorId, targetId, newRank, currentRank }) {
  if (String(actorId) !== String(targetId)) return { allowed: true };

  if (Number.isInteger(newRank) && Number.isInteger(currentRank) && newRank < currentRank) {
    return deny('You cannot raise your own role.', 'SELF_ESCALATION_BLOCKED');
  }

  if (Number.isInteger(newRank) && newRank === currentRank) return { allowed: true };

  return deny('You cannot change your own role.', 'SELF_ROLE_CHANGE_BLOCKED');
}


/**
 * Full pre-write evaluation for PUT /api/admin/roles.
 *
 * Enforces, in order:
 *   1. delegation authority (root ADMIN only, via delegate_role_management)
 *   2. root-role protection (roleValue 0 refused outright)
 *   3. well-formed permission list (no 'ALL' wildcard for non-root roles)
 *   4. rank ceiling + no rewrite of the caller's OWN role (laundering lane)
 *   5. non-delegable permissions can never be assigned
 *   6. permission ceiling: a caller can never grant a permission they lack
 *
 * @param {object} opts
 * @param {object} opts.actor - The acting user document
 * @param {number} opts.roleValue - Target role value
 * @param {string[]} opts.permissions - Requested permission list
 * @returns {Promise<object>} decision
 */
export async function evaluateRolePermissionWrite({ actor, roleValue, permissions }) {
  if (!Number.isInteger(roleValue)) {
    return deny('Invalid roleValue.', 'INVALID_ROLE_VALUE');
  }

  if (!Array.isArray(permissions) || permissions.length > MAX_PERMISSIONS_PER_ROLE) {
    return deny('Invalid permission list.', 'INVALID_PERMISSIONS');
  }

  if (!permissions.every((p) => typeof p === 'string' && p.length > 0 && p.length <= 100)) {
    return deny('Invalid permission list.', 'INVALID_PERMISSIONS');
  }

  const duplicate = permissions.find((p) => permissions.indexOf(p) !== permissions.lastIndexOf(p));
  if (duplicate) {
    return deny('Permission list contains duplicates.', 'DUPLICATE_PERMISSIONS');
  }

  if (!(await hasPermissionDB(actor?.role, PERMISSIONS.DELEGATE_ROLE_MANAGEMENT))) {
    return deny(
      'Only the root Administrator may rewrite role permissions.',
      'DELEGATION_NOT_PERMITTED'
    );
  }

  const rootCheck = evaluateRootRoleWrite(roleValue);
  if (!rootCheck.allowed) return rootCheck;

  const rankCheck = evaluateRankCeiling(actor, roleValue);
  if (!rankCheck.allowed) return rankCheck;

  if (!isRootAdmin(actor) && roleValue === actor.role) {
    return deny(
      'You cannot rewrite the permissions of your own role.',
      'SELF_ROLE_REWRITE_BLOCKED'
    );
  }

  if (permissions.includes(ALL_WILDCARD)) {
    return deny('The ALL wildcard cannot be assigned to a role.', 'WILDCARD_FORBIDDEN');
  }

  const nonDelegable = new Set(getNonDelegablePermissions());
  const forbidden = permissions.filter((p) => nonDelegable.has(p));
  if (forbidden.length > 0) {
    return deny(
      `These permissions can never be assigned: ${forbidden.join(', ')}.`,
      'NON_DELEGABLE_PERMISSION',
      { deniedPermissions: forbidden }
    );
  }

  const unknown = permissions.filter((p) => !PERMISSION_METADATA[p]);
  if (unknown.length > 0) {
    return deny('Unknown permission keys rejected.', 'UNKNOWN_PERMISSION', {
      deniedPermissions: unknown,
    });
  }

  if (!isRootAdmin(actor)) {
    const held = await Promise.all(
      permissions.map((permission) => hasPermissionDB(actor.role, permission))
    );
    const notHeld = permissions.filter((_, index) => !held[index]);
    if (notHeld.length > 0) {
      return deny(
        'You cannot grant permissions you do not hold yourself.',
        'PERMISSION_CEILING_EXCEEDED',
        { deniedPermissions: notHeld }
      );
    }
  }

  return { allowed: true };
}

/**
 * Pre-write evaluation for role changes on a user account.
 * The caller's CHANGE_USER_ROLE permission is checked by requirePermission()
 * before this runs; these are the hierarchy rules.
 *
 * @param {object} opts
 * @param {string} opts.actorId - The acting user id
 * @param {string} opts.targetId - Account being modified
 * @param {number} opts.newRank - Requested role value
 * @param {number} opts.currentRank - Target's current role value
 * @returns {object} decision
 */
export function evaluateUserRoleChange({ actor, actorId, targetId, newRank, currentRank }) {
  const selfCheck = evaluateSelfChange({ actorId, targetId, newRank, currentRank });
  if (!selfCheck.allowed) return selfCheck;

  return evaluateRankCeiling(actor, currentRank, { newRank });
}

