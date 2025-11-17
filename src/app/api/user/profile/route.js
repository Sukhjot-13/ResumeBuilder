
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/user';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';

export async function GET(req) {
  const userId = req.headers.get('x-user-id');

  await dbConnect();

  try {
    const user = await User.findById(userId).populate('mainResume').select('-__v');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  const userId = req.headers.get('x-user-id');
  const body = await req.json();
  const { name, dateOfBirth, mainResume } = body;

  await dbConnect();

  try {
    let updateData = { name, dateOfBirth };

    // If mainResume is a full object, create a new resume document
    if (mainResume && typeof mainResume === 'object' && !mainResume._id) {
      const newResume = new Resume({
        userId,
        content: mainResume,
      });
      await newResume.save();
      updateData.mainResume = newResume._id;
      // Add the new resume to the generatedResumes array
      await User.findByIdAndUpdate(userId, {
        $push: { generatedResumes: newResume._id },
      });

      const metadata = new ResumeMetadata({
        userId,
        resumeId: newResume._id,
        jobTitle: 'Master Resume',
      });
      await metadata.save();

      newResume.metadata = metadata._id;
      await newResume.save();

    } else if (mainResume && mainResume._id) {
      // If mainResume is an object with an ID, just use the ID
      updateData.mainResume = mainResume._id;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('mainResume').select('-__v');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
