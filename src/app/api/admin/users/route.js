import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const resolved = await resolveUserId(req);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.ACCESS_ADMIN_PANEL);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  // Whitelist fields — safer than a deny-list that can silently rot
  const users = await User.find({})
    .select('email name role creditsUsed lastCreditResetDate subscriptionId subscriptionStatus subscriptionExpiresAt customerId createdAt')
    .sort({ createdAt: -1 });
  return ok({ users });
});
