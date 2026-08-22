import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import JobListing from '@/models/JobListing';
import GatekeeperDecision from '@/models/GatekeeperDecision';
import Application from '@/models/Application';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request, { params }) => {
  const { id } = await params;
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const job = await JobListing.findOne({ _id: id, userId }).lean();
  if (!job) return fail('Job not found', 404);

  const [decision, application] = await Promise.all([
    GatekeeperDecision.findOne({ jobId: job._id }).lean(),
    Application.findOne({ jobId: job._id, userId }).sort({ submittedAt: -1 }).lean(),
  ]);

  return ok({
    ...job,
    gatekeeperDecision: decision || null,
    application: application || null,
  });
});

export const DELETE = withErrorHandler(async (request, { params }) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const { id } = await params;
  const job = await JobListing.findOneAndDelete({ _id: id, userId });
  if (!job) return fail('Job not found', 404);

  // Clean up associated records
  await Promise.all([
    GatekeeperDecision.deleteMany({ jobId: id }),
    Application.deleteMany({ jobId: id, userId }),
  ]);

  return ok({ message: 'Job deleted' });
});
