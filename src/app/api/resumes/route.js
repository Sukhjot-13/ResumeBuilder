import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { ResumeService } from '@/services/resumeService';
import { UserService } from '@/services/userService';
import { SubscriptionService } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_RESUMES);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const user = await User.findById(userId).populate({
    path: 'generatedResumes',
    populate: {
      path: 'metadata',
      model: 'ResumeMetadata'
    }
  }).select('generatedResumes');

  if (!user) {
    logger.warn("User not found in GET /api/resumes", { userId });
    return fail('User not found', 404);
  }
  return ok(user.generatedResumes);
});

export const POST = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  let body;
  try {
    body = await req.json();
  } catch (e) {
    logger.warn("Invalid JSON in POST /api/resumes", { userId });
    return fail('Invalid JSON', 400);
  }

  const { content, metadata } = body;

  if (!content) {
    return fail('Resume content is required', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.CREATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const hasCredits = await SubscriptionService.trackUsage(userId, 1);

  if (!hasCredits) {
    logger.info("User attempted to create resume without credits", { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  const newResume = await ResumeService.createResume(
    userId,
    content,
    metadata,
    { returnPopulated: true }
  );

  await UserService.addGeneratedResume(userId, newResume._id);

  logger.info("Resume created successfully", { userId, resumeId: newResume._id });
  return ok(newResume, 'Resume created', 201);
});
