import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import JobCriteria from '@/models/JobCriteria';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_CRITERIA);
  if (isPermissionError(perm)) return perm.error;

  const criteria = await JobCriteria.findOne({ userId });
  return ok(criteria || null);
});

export const PUT = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_CRITERIA);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const criteria = await JobCriteria.findOneAndUpdate(
    { userId },
    { ...body, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return ok(criteria);
});
