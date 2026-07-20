import dbConnect from '@/lib/mongodb';
import Permission from '@/models/Permission';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_ROLES);
  if (isPermissionError(permResult)) return permResult.error;

  await dbConnect();
  const permissions = await Permission.find().sort({ group: 1, key: 1 }).lean();
  return ok({ permissions });
});
