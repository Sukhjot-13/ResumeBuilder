import { generateCoverLetter } from '@/lib/coverLetter-generator';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { sanitizeJobDescription } from '@/lib/sanitize';
import { PERMISSIONS } from '@/lib/constants';
import { SubscriptionService } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CoverLetter from '@/models/CoverLetter';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_COVER_LETTER);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { jobDescription, recipientName } = body;
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
    logger.info('User attempted to generate cover letter without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  const resumeData = user.mainResume?.content || {};
  const userName = user.name || '';
  const userEmail = user.email || '';
  const userPhone = user.mainResume?.content?.profile?.phone || '';

  try {
    const coverLetterData = await generateCoverLetter(
      resumeData,
      cleanJobDescription,
      { recipientName, userName, userEmail, userPhone }
    );

    // Deduct credit after successful generation
    const tracked = await SubscriptionService.trackUsage(userId, 1);
    if (!tracked) {
      logger.warn('Credit deduction failed after cover letter generation', { userId });
    }

    let coverLetterId = null;
    try {
      const doc = await CoverLetter.create({
        userId: user._id,
        content: coverLetterData,
        metadata: {
          jobTitle: coverLetterData.jobTitle || '',
          companyName: coverLetterData.companyName || '',
          coverLetterName: `Cover Letter - ${coverLetterData.companyName || 'Unknown'}`,
        },
      });
      coverLetterId = doc._id.toString();
    } catch (saveErr) {
      logger.error('Failed to save cover letter document', saveErr, { userId });
    }

    logger.info('Cover letter generated successfully', { userId });
    return ok({ coverLetterId, ...coverLetterData });
  } catch (error) {
    logger.error('Error generating cover letter', error, { userId });
    return fail(error.message || 'Error generating cover letter', 500);
  }
});
