import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import JobListing from '@/models/JobListing';
import GatekeeperDecision from '@/models/GatekeeperDecision';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
  if (isPermissionError(perm)) return perm.error;

  const { searchParams } = request.nextUrl;
  const filter = { userId };
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  if (status) filter.status = status;
  if (platform) filter.platform = platform;

  const jobs = await JobListing.find(filter)
    .sort({ scrapedAt: -1 })
    .limit(50)
    .lean();

  // Attach gatekeeper decisions
  const jobIds = jobs.map((j) => j._id);
  const decisions = await GatekeeperDecision.find({ jobId: { $in: jobIds } }).lean();
  const decisionMap = {};
  decisions.forEach((d) => { decisionMap[d.jobId.toString()] = d; });

  const result = jobs.map((job) => ({
    ...job,
    gatekeeperDecision: decisionMap[job._id.toString()] || null,
  }));

  return ok(result);
});

export const POST = withErrorHandler(async (request) => {
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

  const listing = await JobListing.findOneAndUpdate(
    { userId, platform: body.platform, externalId: body.externalId },
    {
      userId,
      platform: body.platform,
      externalId: body.externalId,
      title: body.title,
      company: body.company || 'Unknown Company',
      location: body.location,
      salary: body.salary,
      description: body.description,
      applyUrl: body.applyUrl,
      isEasyApply: body.isEasyApply,
      postedDate: body.postedDate,
      scrapedAt: new Date(),
      status: 'pending',
    },
    { upsert: true, new: true }
  );

  return ok(listing, 'Job listing saved', 201);
});
