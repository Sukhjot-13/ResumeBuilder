import dbConnect from '@/lib/mongodb';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { editCoverLetterWithAI } from '@/services/aiCoverLetterEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import CoverLetter from '@/models/CoverLetter';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  let body;
  try {
    body = await req.json();
  } catch (e) {
    logger.warn('Invalid JSON in POST /api/edit-resume-with-ai', { userId });
    return fail('Invalid JSON', 400);
  }

  const { resume, resumeId, query, createNewResume, type, coverLetterContent, coverLetterId } = body;

  if (!query) {
    return fail('Query is required', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_WITH_AI);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user } = permResult;

  const hasCredits = await SubscriptionService.hasCredits(userId, 1);

  if (!hasCredits) {
    logger.info('User attempted to edit without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  // ── Cover Letter Editing ─────────────────────────────────────────────────
  if (type === 'cover-letter') {
    if (!coverLetterContent) {
      return fail('Cover letter content is required', 400);
    }

    const editedContent = await editCoverLetterWithAI(coverLetterContent, query);

    const tracked = await SubscriptionService.trackUsage(userId, 1);
    if (!tracked) {
      logger.warn('Credit deduction failed after cover letter edit', { userId });
    }

    // Save the edited cover letter
    if (coverLetterId) {
      await CoverLetter.findByIdAndUpdate(coverLetterId, {
        $set: { content: editedContent },
      });
    }

    return ok(editedContent);
  }

  // ── Resume Editing (existing behavior) ──────────────────────────────────
  if (!resume) {
    return fail('Resume is required', 400);
  }

  if (createNewResume) {
    if (!checkPermission(user, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT)) {
      logger.info("Permission denied: CREATE_NEW_RESUME_ON_EDIT", { userId, role: user.role });
      return fail('This feature requires a higher plan.', 403);
    }
  }

  const editedResumeContent = await editResumeWithAI(resume, query);

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

  const tracked = await SubscriptionService.trackUsage(userId, 1);
  if (!tracked) {
    logger.warn("Credit deduction failed after generation", { userId });
  }

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
        const incrementSuffix = (name) => {
          const match = name.match(/^(.*?)\s*(\d+)$/);
          if (match) {
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
