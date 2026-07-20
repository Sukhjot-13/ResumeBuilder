import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { checkAndDowngradeExpiredSubscription } from '@/lib/subscriptionChecker';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  if (!userId) {
    return fail('Unauthorized', 401);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_SUBSCRIPTION);
  if (isPermissionError(permResult)) return permResult.error;

  const user = await User.findById(userId);
  if (!user) {
    return fail('User not found', 404);
  }

  await checkAndDowngradeExpiredSubscription(user);

  return ok({ role: user.role, subscriptionStatus: user.subscriptionStatus });
});
