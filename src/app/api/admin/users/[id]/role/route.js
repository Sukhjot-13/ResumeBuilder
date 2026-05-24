import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const PATCH = withErrorHandler(async (req, { params }) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await params;
  const { role } = await req.json();

  const permResult = await requirePermission(userId, PERMISSIONS.CHANGE_USER_ROLE);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  if (typeof role !== 'number') {
    return fail('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) {
    return fail('User not found', 404);
  }

  return ok({ user });
});
