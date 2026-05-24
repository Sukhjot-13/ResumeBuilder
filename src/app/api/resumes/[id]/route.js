import dbConnect from '@/lib/mongodb';
import Resume from '@/models/resume';
import User from '@/models/User';
import ResumeMetadata from '@/models/resumeMetadata';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req, context) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_RESUMES);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const resume = await Resume.findOne({ _id: id, userId }).select('-__v');

  if (!resume) {
    return fail('Resume not found', 404);
  }

  return ok(resume);
});

export const DELETE = withErrorHandler(async (req, context) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_OWN_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const resume = await Resume.findOneAndDelete({ _id: id, userId });

  if (!resume) {
    return fail('Resume not found', 404);
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { generatedResumes: id },
  });

  await ResumeMetadata.findOneAndDelete({ resumeId: id });

  return ok(null, 'Resume deleted successfully');
});

export const PATCH = withErrorHandler(async (req, context) => {
  const userId = req.headers.get('x-user-id');
  const { id } = await context.params;
  const { jobTitle, companyName, resumeName } = await req.json();

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_RESUME_METADATA);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) {
    return fail('Resume not found', 404);
  }

  const updateFields = { userId };
  if (jobTitle !== undefined) updateFields.jobTitle = jobTitle;
  if (companyName !== undefined) updateFields.companyName = companyName;
  if (resumeName !== undefined) updateFields.resumeName = resumeName;

  const updatedMetadata = await ResumeMetadata.findOneAndUpdate(
    { resumeId: id },
    { $set: updateFields },
    { new: true, upsert: true }
  );

  if (!resume.metadata) {
    resume.metadata = updatedMetadata._id;
    await resume.save();
  }

  return ok(updatedMetadata);
});
