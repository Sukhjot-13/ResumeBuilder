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
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { resume: bodyResume, jobDescription, specialInstructions: rawSpecialInstructions, save: shouldSave = true } = body;
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return fail('Job description is required', 400);
  }

  const user = await User.findById(userId).populate('mainResume');
  if (!user) {
    return fail('User not found', 404);
  }

  // Check credits before generating
  const hasCredits = await SubscriptionService.hasCredits(userId, 1);
  if (!hasCredits) {
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

    // Deduct credit after successful generation
    const tracked = await SubscriptionService.trackUsage(userId, 1);
    if (!tracked) {
      logger.warn('Credit deduction failed after resume generation', { userId });
    }

    logger.info('Resume content generated successfully', { userId, role: userRole });
    return ok({ resumeId, ...tailoredData });
  } catch (error) {
    logger.error('Error generating content', error, { userId });
    return fail(error.message || 'Error generating content', 500);
  }
});
