import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import NotificationPrefs from '@/models/NotificationPrefs';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const userId = request.headers.get('x-user-id');
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  let prefs = await NotificationPrefs.findOne({ userId }).lean();
  if (!prefs) {
    prefs = {
      emailOnApply: true,
      emailOnError: true,
      emailOnCaptcha: true,
      emailOnSchedulerStop: true,
    };
  }

  return ok(prefs);
});

export const PUT = withErrorHandler(async (request) => {
  const userId = request.headers.get('x-user-id');
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const allowedFields = ['emailOnApply', 'emailOnError', 'emailOnCaptcha', 'emailOnSchedulerStop'];
  const update = { lastUpdated: new Date() };

  for (const field of allowedFields) {
    if (typeof body[field] === 'boolean') {
      update[field] = body[field];
    }
  }

  await NotificationPrefs.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true }
  );

  return ok({ message: 'Notification preferences saved' });
});
