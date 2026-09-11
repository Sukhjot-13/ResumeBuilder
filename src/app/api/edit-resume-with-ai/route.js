import dbConnect from '@/lib/mongodb';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { editCoverLetterWithAI } from '@/services/aiCoverLetterEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { checkPermissionDB } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import CoverLetter from '@/models/CoverLetter';
import Resume from '@/models/resume';
import { logger } from '@/lib/logger';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body || {};

  const { resume, resumeId, query, createNewResume, type, coverLetterContent, coverLetterId } = body;

  if (!query) {
    return fail('Query is required', 400);
  }

  if (typeof query !== 'string' || query.length > 2000) {
    return fail('Query must be a string of at most 2000 characters', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_WITH_AI);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user } = permResult;

  // ── Cover Letter Editing ─────────────────────────────────────────────────
  if (type === 'cover-letter') {
    if (!coverLetterContent) {
      return fail('Cover letter content is required', 400);
    }

    // Ownership check before spending AI credits/tokens (C1 fix)
    if (coverLetterId) {
      const owned = await CoverLetter.exists({ _id: coverLetterId, userId });
      if (!owned) {
        logger.warn('AI edit attempted on non-owned cover letter', { userId, coverLetterId });
        return fail('Cover letter not found', 404);
      }
    }

    // Deduct credit BEFORE editing (atomic); refund on failure below
    const tracked = await SubscriptionService.trackUsage(userId, 1);
    if (!tracked) {
      logger.info('User attempted to edit without credits', { userId });
      return fail('Insufficient credits. Please upgrade your plan.', 403);
    }

    let editedContent;
    try {
      editedContent = await editCoverLetterWithAI(coverLetterContent, query);
    } catch (error) {
      await SubscriptionService.refundUsage(userId, 1);
      throw error;
    }

    // Save the edited cover letter (scoped to owner)
    if (coverLetterId) {
      const updated = await CoverLetter.findOneAndUpdate(
        { _id: coverLetterId, userId },
        { $set: { content: editedContent } }
      );
      if (!updated) {
        logger.warn('Owned cover letter disappeared during AI edit', { userId, coverLetterId });
      }
    }

    return ok(editedContent);
  }

  // ── Resume Editing (existing behavior) ──────────────────────────────────
  if (!resume) {
    return fail('Resume is required', 400);
  }

  if (createNewResume) {
    const allowed = await checkPermissionDB(user, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT);
    if (!allowed) {
      logger.info("Permission denied: CREATE_NEW_RESUME_ON_EDIT", { userId, role: user.role });
      return fail('This feature requires a higher plan.', 403);
    }
  }

  // Ownership check before reading/writing any resume (H1 fix)
  const requestedResumeId = resumeId || user.mainResume;
  if (!createNewResume && !requestedResumeId) {
    return fail('A target resume or master resume is required to edit in place', 400);
  }

  if (requestedResumeId) {
    const owned = await Resume.exists({ _id: requestedResumeId, userId });
    if (!owned) {
      logger.warn('AI edit attempted on non-owned resume', { userId, resumeId: String(requestedResumeId) });
      return fail('Resume not found', 404);
    }
  }

  // Deduct credit BEFORE editing (atomic); refund on failure below
  const tracked = await SubscriptionService.trackUsage(userId, 1);
  if (!tracked) {
    logger.info('User attempted to edit without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  let editedResumeContent;
  try {
    editedResumeContent = await editResumeWithAI(resume, query);
  } catch (error) {
    await SubscriptionService.refundUsage(userId, 1);
    throw error;
  }

  const removeIds = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(removeIds);
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj = {};
      for (const key in obj) {
        if (key !== '_id') {
          newObj[key] = removeIds(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  };

  const sanitizedContent = removeIds(editedResumeContent);

  if (createNewResume) {
    // Determine which resume we're copying from — use the selected resumeId
    const sourceResumeId = resumeId || user.mainResume;
    let originalName = 'AI Edited Resume';

    if (sourceResumeId) {
      const currentResume = await ResumeService.getResumeWithMetadata(sourceResumeId, false);

      if (currentResume && currentResume.metadata) {
        // Use resumeName if set, otherwise fall back to jobTitle
        originalName = currentResume.metadata.resumeName || currentResume.metadata.jobTitle || originalName;

        // Add the source resume to generatedResumes list if not already there
        if (!user.generatedResumes.includes(sourceResumeId)) {
          await UserService.addGeneratedResume(userId, sourceResumeId);
        }

        // Increment number on the old resume's name (e.g. "Software Engineer" → "Software Engineer 1")
        // Only treat SMALL trailing numbers as version suffixes — years ("Resume 2024") get " 1"
        const incrementSuffix = (name) => {
          const match = name.match(/^(.*?)\s*(\d{1,2})$/);
          if (match && match[1].trim()) {
            return `${match[1]} ${parseInt(match[2], 10) + 1}`;
          }
          return `${name} 1`;
        };

        await ResumeService.updateResumeMetadata(currentResume.metadata._id, {
          resumeName: incrementSuffix(originalName),
        });
      }
    }

    const metadata = {
      jobTitle: originalName,
      companyName: 'AI Generated',
      resumeName: originalName,
    };

    const newResume = await ResumeService.createResume(
      userId,
      sanitizedContent,
      metadata,
      { returnPopulated: true }
    );

    // Only set as main if we were editing the master
    if (!resumeId || resumeId === user.mainResume?.toString()) {
      await UserService.setMainResume(userId, newResume._id);
    }

    logger.info("New resume created via AI edit", { userId, resumeId: newResume._id });

    return ok(newResume.content);
  } else {
    const targetResumeId = resumeId || user.mainResume;
    const updatedResume = await ResumeService.updateResumeContent(
      targetResumeId,
      sanitizedContent
    );

    logger.info("Resume updated via AI edit", { userId, resumeId: targetResumeId });

    return ok(updatedResume.content);
  }
});
