import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const DELETE = withErrorHandler(async (req, { params }) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await params;

  const permResult = await requirePermission(userId, PERMISSIONS.ACCESS_ADMIN_PANEL);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  if (userId === id) {
    return fail('Cannot delete your own account', 400);
  }

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return fail('User not found', 404);
  }

  return ok(null, 'User deleted successfully');
});
