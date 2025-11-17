
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';
import Resume from '@/models/resume';
import { editResumeWithAI } from '@/services/aiResumeEditorService';

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
    const editedResumeContent = await editResumeWithAI(resume, query);

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await Resume.findByIdAndUpdate(user.mainResume, {
      $set: { content: editedResumeContent },
    });

    const updatedResume = await Resume.findById(user.mainResume);

    return NextResponse.json(updatedResume.content);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
