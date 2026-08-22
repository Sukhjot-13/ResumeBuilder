import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import ApplyInstructions from '@/models/ApplyInstructions';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const doc = await ApplyInstructions.findOne({ userId }).lean();
  return ok({ instructions: doc?.instructions || '' });
});

export const PUT = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  if (typeof body.instructions !== 'string') {
    return fail('instructions field is required', 400);
  }

  await ApplyInstructions.findOneAndUpdate(
    { userId },
    { instructions: body.instructions, updatedAt: new Date() },
    { upsert: true }
  );

  return ok({ message: 'Instructions saved' });
});
