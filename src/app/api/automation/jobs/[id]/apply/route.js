import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import JobListing from '@/models/JobListing';
import env from '@/config/env';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (request, { params }) => {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const job = await JobListing.findOne({ _id: id, userId }).lean();
  if (!job) return fail('Job not found', 404);

  const workerUrl = env.workerUrl;
  if (!workerUrl) return fail('Worker URL not configured', 500);

  try {
    const res = await fetch(`${workerUrl}/trigger/apply-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: id }),
    });
    if (!res.ok) {
      const text = await res.text();
      return fail(`Worker error: ${text}`, 502);
    }
    return ok({ message: 'Apply job queued' });
  } catch (err) {
    return fail(`Could not reach worker: ${err.message}`, 502);
  }
});
