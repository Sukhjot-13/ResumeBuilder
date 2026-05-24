import dbConnect from '@/lib/mongodb';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  let body;
  try {
    body = await req.json();
  } catch (e) {
    logger.warn("Invalid JSON in POST /api/edit-resume-with-ai", { userId });
    return fail('Invalid JSON', 400);
  }

  const { resume, query, createNewResume } = body;

  if (!resume || !query) {
    return fail('Resume and query are required', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_WITH_AI);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user } = permResult;

  const hasCredits = await SubscriptionService.hasCredits(userId, 1);

  if (!hasCredits) {
    logger.info("User attempted to edit resume without credits", { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
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
    if (user.mainResume && !user.generatedResumes.includes(user.mainResume)) {
      await UserService.addGeneratedResume(userId, user.mainResume);
    }

    let originalJobTitle = 'AI Edited Resume';

    if (user.mainResume) {
      const currentResume = await ResumeService.getResumeWithMetadata(user.mainResume, false);

      if (currentResume && currentResume.metadata) {
        originalJobTitle = currentResume.metadata.jobTitle || originalJobTitle;

        await ResumeService.updateResumeMetadata(currentResume.metadata._id, {
          jobTitle: `${originalJobTitle} 1`
        });
      }
    }

    const metadata = {
      jobTitle: originalJobTitle,
      companyName: 'AI Generated',
    };

    const newResume = await ResumeService.createResume(
      userId,
      sanitizedContent,
      metadata,
      { returnPopulated: true }
    );

    await UserService.setMainResume(userId, newResume._id);

    logger.info("New resume created via AI edit", { userId, resumeId: newResume._id });

    return ok(newResume.content);
  } else {
    const updatedResume = await ResumeService.updateResumeContent(
      user.mainResume,
      sanitizedContent
    );

    logger.info("Resume updated via AI edit", { userId, resumeId: user.mainResume });

    return ok(updatedResume.content);
  }
});
