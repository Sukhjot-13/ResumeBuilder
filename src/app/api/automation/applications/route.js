import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import Application from '@/models/Application';
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

  const app = await Application.create({
    userId,
    jobId: body.jobId,
    resumeId: body.resumeId,
    resumeUrl: body.resumeUrl,
    status: body.status || 'pending',
    submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
    errorMessage: body.errorMessage,
    platform: body.platform,
  });

  return ok(app, 'Application saved', 201);
});
