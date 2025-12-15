import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { UserService } from '@/services/userService';
import { ResumeService } from '@/services/resumeService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function POST(req) {
  const userId = req.headers.get('x-user-id');

  let body;
  try {
    body = await req.json();
  } catch (e) {
    logger.warn("Invalid JSON in POST /api/edit-resume-with-ai", { userId });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { resume, query, createNewResume } = body;

  if (!resume || !query) {
    return NextResponse.json({ error: 'Resume and query are required' }, { status: 400 });
  }

  await dbConnect();

  // Check initial permission using standardized helper
  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_WITH_AI);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user } = permResult;

  try {

    // Check if user has enough credits BEFORE generating
    const hasCredits = await SubscriptionService.hasCredits(userId, 1);
    
    if (!hasCredits) {
      logger.info("User attempted to edit resume without credits", { userId });
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Check permission for "Create New Resume" feature if requested
    if (createNewResume) {
      if (!checkPermission(user, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT)) {
        logger.info("Permission denied: CREATE_NEW_RESUME_ON_EDIT", { userId, role: user.role });
        return NextResponse.json(
          { error: 'This feature requires a higher plan.' },
          { status: 403 }
        );
      }
    }

    const editedResumeContent = await editResumeWithAI(resume, query);

    // Helper function to recursively remove _id fields
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

    // Sanitize the content to remove any AI-generated _id fields
    const sanitizedContent = removeIds(editedResumeContent);

    // DEDUCT CREDITS HERE - Only after successful generation and parsing
    const tracked = await SubscriptionService.trackUsage(userId, 1);
    if (!tracked) {
        // This theoretically shouldn't happen due to the check above, but good for safety
        logger.warn("Credit deduction failed after generation", { userId });
        // We still proceed since the work is done, but log it.
    }

    if (createNewResume) {
      // Archive the current main resume if it's not already in generatedResumes
      if (user.mainResume && !user.generatedResumes.includes(user.mainResume)) {
        await UserService.addGeneratedResume(userId, user.mainResume);
      }

      // Fetch current resume to get metadata for clear naming
      let originalJobTitle = 'AI Edited Resume';
      
      if (user.mainResume) {
        const currentResume = await ResumeService.getResumeWithMetadata(user.mainResume, false);
        
        if (currentResume && currentResume.metadata) {
          originalJobTitle = currentResume.metadata.jobTitle || originalJobTitle;
          
          // Rename the OLD resume (append " 1")
          // This ensures the new resume (which takes the main slot) keeps the "current" name
          await ResumeService.updateResumeMetadata(currentResume.metadata._id, {
            jobTitle: `${originalJobTitle} 1`
          });
        }
      }

      // Create new resume with the ORIGINAL name
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

      // Set as main resume using UserService
      await UserService.setMainResume(userId, newResume._id);

      logger.info("New resume created via AI edit", { userId, resumeId: newResume._id });
      
      return NextResponse.json(newResume.content);
    } else {
      // Default behavior: Overwrite existing main resume using ResumeService
      const updatedResume = await ResumeService.updateResumeContent(
        user.mainResume,
        sanitizedContent
      );

      logger.info("Resume updated via AI edit", { userId, resumeId: user.mainResume });
      
      return NextResponse.json(updatedResume.content);
    }

  } catch (error) {
    logger.error("Error in POST /api/edit-resume-with-ai", error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
