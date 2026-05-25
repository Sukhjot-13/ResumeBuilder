import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import JobListing from '@/models/JobListing';
import GatekeeperDecision from '@/models/GatekeeperDecision';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request, { params }) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const job = await JobListing.findOne({ _id: params.id, userId }).lean();
  if (!job) return fail('Job not found', 404);

  const decision = await GatekeeperDecision.findOne({ jobId: job._id }).lean();
  return ok({ ...job, gatekeeperDecision: decision || null });
});
