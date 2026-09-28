import { requirePermission, isPermissionError, isValidObjectId } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS, ROLES } from '@/lib/constants';
import { evaluateUserRoleChange } from '@/lib/roleAuthorization';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import { logger } from '@/lib/logger';
import User from '@/models/User';
import { ok, fail, failWithCode, withErrorHandler, readJson } from '@/lib/apiResponse';

export const PATCH = withErrorHandler(async (req, { params }) => {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return fail('Invalid user id', 400);
  }

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.body || {};

  const permResult = await requirePermission(adminId, PERMISSIONS.CHANGE_USER_ROLE);
  if (isPermissionError(permResult)) {
    await recordAuthorizationEvent({
      actorId: adminId,
      action: 'user.role.denied',
      targetType: 'User',
      targetId: id,
      outcome: 'denied',
      after: { code: 'PERMISSION_DENIED', permission: PERMISSIONS.CHANGE_USER_ROLE },
      request: req,
    });
    return permResult.error;
  }
  const { user: actor } = permResult;

  // Validate against the ROLES enum (rejects NaN / unknown values)
  if (!Number.isInteger(role) || !Object.values(ROLES).includes(role)) {
    return fail('Invalid role', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

  // Self-escalation + rank ceiling. Previously only self-DEMOTION was blocked,
  // so a caller could promote their own account to root ADMIN.
  const decision = evaluateUserRoleChange({
    actor,
    actorId: adminId,
    targetId: id,
    newRank: role,
    currentRank: user.role,
  });
  if (!decision.allowed) {
    logger.warn('Role change refused', {
      actorId: adminId,
      actorRole: actor.role,
      targetId: id,
      newRole: role,
      code: decision.code,
    });
    await recordAuthorizationEvent({
      actorId: adminId,
      actorRole: actor.role,
      action: 'user.role.denied',
      targetType: 'User',
      targetId: id,
      outcome: 'denied',
      before: { role: user.role },
      after: { role, code: decision.code },
      request: req,
    });
    return failWithCode(decision.reason, decision.code, 403);
  }

  const previousRole = user.role;

  // Keep subscription state in sync with manual role changes so an
  // admin-promoted subscriber actually receives Pro credits (getLimit
  // requires status 'active', and new users default to 'none').
  // Pro is a monthly plan: grants last 30 days, then the existing periodic
  // subscription checker downgrades automatically on expiry.
  const set = { role };
  const unset = {};
  const now = new Date();
  const hasLiveSub =
    user.subscriptionStatus === 'active' &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > now;

  if (role === ROLES.SUBSCRIBER && !hasLiveSub) {
    // Manual grant: fresh monthly Pro window with reset credits.
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30);
    set.subscriptionStatus = 'active';
    set.subscriptionExpiresAt = expiry;
    set.creditsUsed = 0;
    set.lastCreditResetDate = now;
  } else if (role === ROLES.USER && user.role === ROLES.SUBSCRIBER) {
    // Manual revocation: clear the Pro window so Free limits apply cleanly.
    set.subscriptionStatus = 'none';
    set.creditsUsed = 0;
    set.lastCreditResetDate = now;
    unset.subscriptionId = '';
    unset.subscriptionExpiresAt = '';
  }

  const updateOp = Object.keys(unset).length > 0 ? { $set: set, $unset: unset } : set;

  const updated = await User.findByIdAndUpdate(id, updateOp, { new: true }).select(
    '-otp -otpExpires'
  );

  if (!updated) {
    return fail('User not found', 404);
  }

  await recordAuthorizationEvent({
    actorId: adminId,
    actorRole: actor.role,
    action: 'user.role.updated',
    targetType: 'User',
    targetId: id,
    before: { role: previousRole },
    after: { role, subscriptionStatus: set.subscriptionStatus },
    request: req,
  });

  return ok({ user: updated });
});

