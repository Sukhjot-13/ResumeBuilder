import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS, ROLES } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const PATCH = withErrorHandler(async (req, { params }) => {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.body || {};

  const permResult = await requirePermission(adminId, PERMISSIONS.CHANGE_USER_ROLE);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  // Validate against the ROLES enum (rejects NaN / unknown values)
  if (!Number.isInteger(role) || !Object.values(ROLES).includes(role)) {
    return fail('Invalid role', 400);
  }

  // Prevent self-demotion lockout
  if (id === adminId && role !== ROLES.ADMIN) {
    return fail('You cannot change your own role.', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

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

  return ok({ user: updated });
});
