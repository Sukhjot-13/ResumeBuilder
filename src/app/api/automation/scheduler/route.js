import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import SchedulerSettings from '@/models/SchedulerSettings';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_SCHEDULER);
  if (isPermissionError(perm)) return perm.error;

  const settings = await SchedulerSettings.findOne({ userId });
  return ok(settings || null);
});

export const PUT = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_SCHEDULER);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const settings = await SchedulerSettings.findOneAndUpdate(
    { userId },
    { ...body, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return ok(settings);
});
