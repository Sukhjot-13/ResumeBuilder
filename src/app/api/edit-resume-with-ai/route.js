import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { hasPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  
  if (!userId) {
    logger.warn("Unauthorized access attempt to POST /api/edit-resume-with-ai");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.warn("User not found in POST /api/edit-resume-with-ai", { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check permission for "Edit with AI" feature
    if (!hasPermission(user.role, PERMISSIONS.EDIT_RESUME_WITH_AI)) {
      logger.info("Permission denied: EDIT_RESUME_WITH_AI", { userId, role: user.role });
      return NextResponse.json(
        { error: 'This feature requires a Pro subscription.' },
        { status: 403 }
      );
    }

    // Check and track usage
    const hasCredits = await SubscriptionService.trackUsage(userId, 1);
    
    if (!hasCredits) {
      logger.info("User attempted to edit resume without credits", { userId });
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Check permission for "Create New Resume" feature if requested
    if (createNewResume) {
      if (!hasPermission(user.role, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT)) {
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

    if (createNewResume) {
      // 1. Archive the current main resume (add to generatedResumes if not already there)
      if (user.mainResume && !user.generatedResumes.includes(user.mainResume)) {
        user.generatedResumes.push(user.mainResume);
      }

      // 2. Create a new Resume document
      const newResume = await Resume.create({
        userId: user._id,
        content: sanitizedContent,
      });

      // 3. Create metadata for the new resume
      const newMetadata = await ResumeMetadata.create({
        userId: user._id,
        resumeId: newResume._id,
        jobTitle: sanitizedContent.profile?.headline || 'AI Edited Resume',
        companyName: 'AI Generated',
      });

      newResume.metadata = newMetadata._id;
      await newResume.save();

      // 4. Update user: set new resume as main
      user.mainResume = newResume._id;
      await user.save();

      logger.info("New resume created via AI edit", { userId, resumeId: newResume._id });
      
      const populatedResume = await Resume.findById(newResume._id).populate('metadata');
      return NextResponse.json(populatedResume.content);

    } else {
      // Default behavior: Overwrite existing main resume
      await Resume.findByIdAndUpdate(user.mainResume, {
        $set: { content: sanitizedContent },
      });

      logger.info("Resume updated via AI edit", { userId, resumeId: user.mainResume });
      
      const updatedResume = await Resume.findById(user.mainResume);
      return NextResponse.json(updatedResume.content);
    }

  } catch (error) {
    logger.error("Error in POST /api/edit-resume-with-ai", error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
