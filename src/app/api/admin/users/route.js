import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS, PLANS, ROLES } from '@/lib/constants';
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
    .sort({ createdAt: -1 })
    .lean();

  // `plan` is not a stored field — derive it server-side so the admin Plan
  // column reflects the real entitlement instead of always rendering "Free".
  const withPlan = users.map((user) => ({
    ...user,
    plan:
      user.role === ROLES.SUBSCRIBER && user.subscriptionStatus === 'active'
        ? { name: PLANS.PRO.name }
        : { name: PLANS.FREE.name },
  }));

  return ok({ users: withPlan });
});
