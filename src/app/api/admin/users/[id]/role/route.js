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

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true }
  ).select('-otp -otpExpires');

  if (!user) {
    return fail('User not found', 404);
  }

  return ok({ user });
});
