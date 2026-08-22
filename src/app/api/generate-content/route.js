import { generateResume } from '@/lib/resume-generator';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { sanitizeJobDescription } from '@/lib/sanitize';
import { SubscriptionService } from '@/services/subscriptionService';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import { checkPermission } from '@/lib/accessControl';
import User from '@/models/User';
import Resume from '@/models/resume';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body || {};

  const { resume: bodyResume, jobDescription, specialInstructions: rawSpecialInstructions, save: shouldSave = true } = body;
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return fail('Job description is required', 400);
  }

  const user = await User.findById(userId).populate('mainResume');
  if (!user) {
    return fail('User not found', 404);
  }

  // Deduct credit BEFORE generating (atomic); refund on failure below
  const tracked = await SubscriptionService.trackUsage(userId, 1);
  if (!tracked) {
    logger.info('User attempted to generate without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  const userRole = user.role;
  const hasSpecialInstructionsPermission = checkPermission(
    { role: userRole },
    PERMISSIONS.USE_SPECIAL_INSTRUCTIONS
  );
  const specialInstructions = hasSpecialInstructionsPermission
    ? (rawSpecialInstructions || '')
    : '';

  if (rawSpecialInstructions && !hasSpecialInstructionsPermission) {
    logger.warn('User attempted to use special instructions without permission', { userId });
  }

  // Use provided resume data, or fall back to the user's master resume
  const resumeData = bodyResume || user.mainResume?.content || {};

  try {
    const tailoredData = await generateResume(
      resumeData,
      cleanJobDescription,
      specialInstructions,
      userRole
    );

    // Persist the generated resume (skipped if save:false)
    let resumeId = null;
    if (shouldSave) {
      try {
        const resumeDoc = await Resume.create({
          userId: user._id,
          content: tailoredData.resume || tailoredData,
          metadata: tailoredData.metadata || undefined,
        });
        resumeId = resumeDoc._id.toString();
      } catch (saveErr) {
        logger.error('Failed to save generated resume document', saveErr, { userId });
        // Non-fatal — return the content anyway
      }
    }

    logger.info('Resume content generated successfully', { userId, role: userRole });
    return ok({ resumeId, ...tailoredData });
  } catch (error) {
    await SubscriptionService.refundUsage(userId, 1);
    logger.error('Error generating content', error, { userId });
    return fail('Error generating resume content. Please try again.', 500);
  }
});
