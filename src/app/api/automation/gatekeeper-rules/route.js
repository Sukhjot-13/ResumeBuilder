import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import GatekeeperRules from '@/models/GatekeeperRules';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_GATEKEEPER_RULES);
  if (isPermissionError(perm)) return perm.error;

  const rules = await GatekeeperRules.findOne({ userId });
  return ok(rules || null);
});

export const PUT = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_GATEKEEPER_RULES);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const rules = await GatekeeperRules.findOneAndUpdate(
    { userId },
    { ...body, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return ok(rules);
});
