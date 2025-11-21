
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { SubscriptionService } from '@/services/subscriptionService';
import { FeatureAccessService } from '@/services/featureAccessService';

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  const { resume, query, createNewResume } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resume || !query) {
    return NextResponse.json({ error: 'Resume and query are required' }, { status: 400 });
  }

  await dbConnect();

  try {
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check access for "Edit with AI" feature
    const hasAccess = FeatureAccessService.hasAccess('EDIT_RESUME_WITH_AI', user.role);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'This feature requires a Pro subscription.' },
        { status: 403 }
      );
    }

    // Check and track usage
    const hasCredits = await SubscriptionService.trackUsage(userId, 1);
    
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Check access for "Create New Resume" feature if requested
    if (createNewResume) {
      const hasAccess = FeatureAccessService.hasAccess('CREATE_NEW_RESUME_ON_EDIT', user.role);
      if (!hasAccess) {
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

      // 4. Update user: add new resume to generated list and set as main
      // Note: We push the NEW resume to generatedResumes as well, so it appears in the history list if we switch away from it later?
      // Actually, usually mainResume is NOT in generatedResumes list in some implementations, or it IS.
      // The previous code `user.generatedResumes.push(user.mainResume)` implies the OLD main goes to history.
      // The new main is set as `mainResume`.
      // Let's follow that pattern.
      
      user.mainResume = newResume._id;
      await user.save();

      const populatedResume = await Resume.findById(newResume._id).populate('metadata');
      return NextResponse.json(populatedResume.content);

    } else {
      // Default behavior: Overwrite existing main resume
      await Resume.findByIdAndUpdate(user.mainResume, {
        $set: { content: sanitizedContent },
      });

      const updatedResume = await Resume.findById(user.mainResume);
      return NextResponse.json(updatedResume.content);
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
