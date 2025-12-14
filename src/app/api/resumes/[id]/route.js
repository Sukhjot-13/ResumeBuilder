
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Resume from '@/models/resume';
import User from '@/models/User';
import ResumeMetadata from '@/models/resumeMetadata';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';

export async function GET(req, context) {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_RESUMES);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

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

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_OWN_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

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

export async function PATCH(req, context) {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;
  const { jobTitle, companyName } = await req.json();

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_METADATA);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    // Verify the resume belongs to the user
    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Update or create metadata
    // Note: Sometimes metadata might not exist if it's an old resume, so upsert might be useful,
    // but usually we expect it to exist. We'll use findOneAndUpdate with upsert: true just in case,
    // but we need to be careful about the resumeId.
    
    const updatedMetadata = await ResumeMetadata.findOneAndUpdate(
      { resumeId: id },
      { 
        $set: { 
          jobTitle, 
          companyName,
          userId // Ensure userId is set if creating new
        } 
      },
      { new: true, upsert: true }
    );

    // Ensure the resume points to this metadata (if it was just created)
    if (!resume.metadata) {
      resume.metadata = updatedMetadata._id;
      await resume.save();
    }

    return NextResponse.json(updatedMetadata);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
