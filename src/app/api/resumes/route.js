
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/resume';
import User from '@/models/user';
import ResumeMetadata from '@/models/resumeMetadata';

export async function GET(req) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    const user = await User.findById(userId).populate({
      path: 'generatedResumes',
      populate: {
        path: 'metadata',
        model: 'ResumeMetadata'
      }
    }).select('generatedResumes');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user.generatedResumes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  const userId = req.headers.get('x-user-id');
  const { content, metadata } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!content) {
    return NextResponse.json({ error: 'Resume content is required' }, { status: 400 });
  }

  await dbConnect();

  try {
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

    return NextResponse.json(populatedResume, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
