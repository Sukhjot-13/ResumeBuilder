import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/resume';
import User from '@/models/User';
import ResumeMetadata from '@/models/resumeMetadata';
import { SubscriptionService } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';

export async function GET(req) {
  const userId = req.headers.get('x-user-id');

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_RESUMES);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    const user = await User.findById(userId).populate({
      path: 'generatedResumes',
      populate: {
        path: 'metadata',
        model: 'ResumeMetadata'
      }
    }).select('generatedResumes');
    
    if (!user) {
      logger.warn("User not found in GET /api/resumes", { userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user.generatedResumes);
  } catch (error) {
    logger.error("Error in GET /api/resumes", error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const userId = req.headers.get('x-user-id');

  let body;
  try {
    body = await req.json();
  } catch (e) {
    logger.warn("Invalid JSON in POST /api/resumes", { userId });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content, metadata } = body;

  if (!content) {
    return NextResponse.json({ error: 'Resume content is required' }, { status: 400 });
  }

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.CREATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    // Check and track usage
    const hasCredits = await SubscriptionService.trackUsage(userId, 1);
    
    if (!hasCredits) {
      logger.info("User attempted to create resume without credits", { userId });
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Create the new resume
    const newResume = new Resume({
      userId,
      content,
    });
    await newResume.save();

    // Add the new resume's ID to the user's generatedResumes array
    await User.findByIdAndUpdate(userId, {
      $push: { generatedResumes: newResume._id },
    });

    if (metadata) {
      const newMetadata = new ResumeMetadata({
        userId,
        resumeId: newResume._id,
        jobTitle: metadata.jobTitle,
        companyName: metadata.companyName,
      });
      await newMetadata.save();

      newResume.metadata = newMetadata._id;
      await newResume.save();
    }

    const populatedResume = await Resume.findById(newResume._id).populate('metadata');
    
    logger.info("Resume created successfully", { userId, resumeId: newResume._id });
    return NextResponse.json(populatedResume, { status: 201 });
  } catch (error) {
    logger.error("Error in POST /api/resumes", error, { userId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
