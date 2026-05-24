import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req, { params }) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await params;

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_CREDITS);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

  user.creditsUsed = 0;
  await user.save();

  return ok({ creditsUsed: 0 });
});
