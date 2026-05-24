import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req, { params }) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await params;
  const { amount } = await req.json();

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_CREDITS);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  if (typeof amount !== 'number') {
    return fail('Invalid amount', 400);
  }

  // Use $inc for atomic update — safe even with concurrent requests
  const user = await User.findByIdAndUpdate(
    id,
    { $inc: { creditsUsed: amount } },
    { new: true }
  );

  if (!user) {
    return fail('User not found', 404);
  }

  return ok({ creditsUsed: user.creditsUsed });
});
