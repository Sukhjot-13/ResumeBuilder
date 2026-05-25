import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import { checkPermission } from '@/lib/accessControl';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  await dbConnect();

  const user = await User.findById(userId).populate({
    path: 'mainResume',
    populate: {
      path: 'metadata',
      model: 'ResumeMetadata',
    },
  });

  if (!user) {
    logger.warn('User not found in GET /api/user/profile', { userId });
    return fail('User not found', 404);
  }

  if (!checkPermission(user, PERMISSIONS.VIEW_OWN_PROFILE)) {
    return fail('Permission denied', 403);
  }

  return ok({
    id: user._id,
    email: user.email,
    name: user.name,
    dateOfBirth: user.dateOfBirth,
    mainResume: user.mainResume,
    creditsUsed: user.creditsUsed || 0,
    role: user.role,
  });
});

export const PUT = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  await dbConnect();

  const body = await req.json();
  const { mainResume, name, dateOfBirth } = body;

  const user = await User.findById(userId);

  if (!user) {
    logger.warn('User not found in PUT /api/user/profile', { userId });
    return fail('User not found', 404);
  }

  if (!checkPermission(user, PERMISSIONS.EDIT_OWN_PROFILE)) {
    return fail('Permission denied', 403);
  }

  // Handle mainResume update
  if (mainResume) {
    const newResume = new Resume({
      userId: user._id,
      content: mainResume,
    });
    await newResume.save();
    user.mainResume = newResume._id;
  }

  if (name !== undefined) user.name = name;
  if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

  await user.save();

  const updatedUser = await User.findById(user._id).populate({
    path: 'mainResume',
    populate: {
      path: 'metadata',
      model: 'ResumeMetadata',
    },
  });

  logger.info('Profile updated', { userId });
  return ok({
    id: updatedUser._id,
    email: updatedUser.email,
    name: updatedUser.name,
    dateOfBirth: updatedUser.dateOfBirth,
    mainResume: updatedUser.mainResume,
  });
});
