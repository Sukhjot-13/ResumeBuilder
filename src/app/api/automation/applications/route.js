import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import Application from '@/models/Application';
import JobListing from '@/models/JobListing';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_APPLICATIONS);
  if (isPermissionError(perm)) return perm.error;

  const apps = await Application.find({ userId })
    .sort({ submittedAt: -1 })
    .limit(50)
    .populate('jobId', 'title company platform')
    .lean();

  return ok(apps);
});

export const POST = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_APPLICATIONS);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const appStatus = body.status || 'pending';
  const app = await Application.create({
    userId,
    jobId: body.jobId,
    resumeId: body.resumeId,
    resumeUrl: body.resumeUrl,
    status: appStatus,
    submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
    errorMessage: body.errorMessage,
    platform: body.platform,
  });

  // Sync job listing status to match the application
  if (body.jobId) {
    const jobStatusMap = {
      submitted: 'applied',
      failed: 'failed',
      external_apply: 'external_apply',
    };
    const listingStatus = jobStatusMap[appStatus] || appStatus;
    await JobListing.findByIdAndUpdate(body.jobId, { status: listingStatus }).catch(e =>
      console.error('[Applications] Failed to sync job status:', e.message)
    );
  }

  return ok(app, 'Application saved', 201);
});
