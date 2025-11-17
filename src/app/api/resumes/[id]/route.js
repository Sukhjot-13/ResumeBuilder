
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/resume';
import User from '@/models/user';
import ResumeMetadata from '@/models/resumeMetadata';

export async function GET(req, context) {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    const resume = await Resume.findOne({ _id: id, userId }).select('-__v');

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  try {
    // Find and delete the resume, ensuring it belongs to the user
    const resume = await Resume.findOneAndDelete({ _id: id, userId });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Remove the resume reference from the user's generatedResumes array
    await User.findByIdAndUpdate(userId, {
      $pull: { generatedResumes: id },
    });

    // Delete the associated metadata
    await ResumeMetadata.findOneAndDelete({ resumeId: id });

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
