import dbConnect from '@/lib/mongodb';
import Role from '@/models/Role';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_ROLES);
  if (isPermissionError(permResult)) return permResult.error;

  await dbConnect();
  const roles = await Role.find().sort({ value: 1 }).lean();
  return ok({ roles });
});

export const PUT = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_ROLES);
  if (isPermissionError(permResult)) return permResult.error;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { roleValue, permissions } = parsed.body || {};

  if (typeof roleValue !== 'number' || !Array.isArray(permissions)) {
    return fail('Invalid request. Need roleValue (number) and permissions (array)', 400);
  }

  await dbConnect();

  const role = await Role.findOneAndUpdate(
    { value: roleValue },
    { $set: { permissions } },
    { new: true }
  );

  if (!role) return fail('Role not found', 404);
  return ok({ role });
});
