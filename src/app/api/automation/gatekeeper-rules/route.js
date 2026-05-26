import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import GatekeeperRules from '@/models/GatekeeperRules';
import JobCriteria from '@/models/JobCriteria';
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

  // Redirect salary/work-mode fields to JobCriteria (consolidated source of truth)
  const jobCriteriaFields = {};
  const legacyFields = ['minSalary', 'allowRemote', 'allowHybrid', 'allowOnSite', 'remote', 'hybrid', 'onSite'];
  for (const key of legacyFields) {
    if (key in body) {
      const mapped = key === 'minSalary' ? 'minSalary'
        : key === 'allowRemote' || key === 'remote' ? 'remote'
        : key === 'allowHybrid' || key === 'hybrid' ? 'hybrid'
        : 'onSite';
      jobCriteriaFields[mapped] = body[key];
      delete body[key];
    }
  }

  if (Object.keys(jobCriteriaFields).length > 0) {
    await JobCriteria.findOneAndUpdate(
      { userId },
      { $set: { ...jobCriteriaFields, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  const rules = await GatekeeperRules.findOneAndUpdate(
    { userId },
    { ...body, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  return ok(rules);
});
