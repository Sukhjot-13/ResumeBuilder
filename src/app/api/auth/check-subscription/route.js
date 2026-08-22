import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthenticatedUser } from '@/lib/serverAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { checkAndDowngradeExpiredSubscription } from '@/lib/subscriptionChecker';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

// Authenticates via HttpOnly JWT cookies (serverAuth) — never trusts client headers.
export const POST = withErrorHandler(async () => {
  const { userId } = await getAuthenticatedUser();
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
