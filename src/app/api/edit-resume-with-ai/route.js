
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import { editResumeWithAI } from '@/services/aiResumeEditorService';
import { SubscriptionService } from '@/services/subscriptionService';

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  const { resume, query } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resume || !query) {
    return NextResponse.json({ error: 'Resume and query are required' }, { status: 400 });
  }

  await dbConnect();

  try {
    // Check and track usage
    const hasCredits = await SubscriptionService.trackUsage(userId, 1);
    
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please upgrade your plan.' },
        { status: 403 }
      );
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

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await Resume.findByIdAndUpdate(user.mainResume, {
      $set: { content: sanitizedContent },
    });

    const updatedResume = await Resume.findById(user.mainResume);

    return NextResponse.json(updatedResume.content);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
