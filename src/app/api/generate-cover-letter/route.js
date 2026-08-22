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
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_COVER_LETTER);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body || {};

  const { jobDescription, recipientName, save } = body;
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return fail('Job description is required', 400);
  }

  const user = await User.findById(userId).populate('mainResume');
  if (!user) {
    return fail('User not found', 404);
  }

  // Reject an empty/missing master resume BEFORE spending a credit
  const resumeData = user.mainResume?.content || {};
  const hasContent =
    Boolean(user.mainResume) &&
    (Boolean(resumeData.profile?.full_name) ||
      (Array.isArray(resumeData.work_experience) && resumeData.work_experience.length > 0));
  if (!hasContent) {
    return fail('Please save a master resume in your Profile before generating a cover letter.', 400);
  }

  // Deduct credit BEFORE generating (atomic); refund on failure below
  const tracked = await SubscriptionService.trackUsage(userId, 1);
  if (!tracked) {
    logger.info('User attempted to generate cover letter without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  const userName = user.name || '';
  const userEmail = user.email || '';
  const userPhone = user.mainResume?.content?.profile?.phone || '';

  try {
    const coverLetterData = await generateCoverLetter(
      resumeData,
      cleanJobDescription,
      { recipientName, userName, userEmail, userPhone }
    );

    // Default is to persist; callers may pass save:false for preview-only use
    const shouldSave = save !== false;
    let coverLetterId = null;
    if (shouldSave) {
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
    }

    logger.info('Cover letter generated successfully', { userId, saved: shouldSave });
    return ok({ coverLetterId, ...coverLetterData });
  } catch (error) {
    await SubscriptionService.refundUsage(userId, 1);
    logger.error('Error generating cover letter', error, { userId });
    return fail('Error generating cover letter. Please try again.', 500);
  }
});
