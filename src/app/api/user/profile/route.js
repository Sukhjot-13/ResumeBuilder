import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { RESUME_FIELD_SCHEMA } from '@/lib/resumeFields';
import { SubscriptionService } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

// Whitelist of fields returned to clients — never expose otp/otpExpires/customerId etc.
const PROFILE_FIELDS = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  dateOfBirth: user.dateOfBirth,
  mainResume: user.mainResume,
  creditsUsed: user.creditsUsed || 0,
  role: user.role,
});

async function buildProfilePayload(user) {
  // Server-computed remaining credits — single source of truth for billing UI
  const limit = await SubscriptionService.getLimit(user);
  return {
    ...PROFILE_FIELDS(user),
    creditsRemaining: Number.isFinite(limit)
      ? Math.max(0, limit - (user.creditsUsed || 0))
      : null,
  };
}

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_OWN_PROFILE);
  if (isPermissionError(permResult)) return permResult.error;
  const { user } = permResult;

  const fullUser = await User.findById(user._id).populate({
    path: 'mainResume',
    populate: {
      path: 'metadata',
      model: 'ResumeMetadata',
    },
  });

  if (!fullUser) {
    logger.warn('User not found in GET /api/user/profile', { userId });
    return fail('User not found', 404);
  }

  return ok(await buildProfilePayload(fullUser));
});

// Basic shape validation for the resume content sections
function isValidResumeContent(content) {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) return false;
  const sectionKeys = Object.keys(RESUME_FIELD_SCHEMA);
  // Must contain at least one known section and only string/array values in them
  return sectionKeys.some((k) => content[k] !== undefined);
}

export const PUT = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { mainResume, name, dateOfBirth } = body || {};

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)) {
    return fail('Invalid name', 400);
  }
  if (dateOfBirth !== undefined && dateOfBirth !== null && !/^\d{4}-\d{2}-\d{2}/.test(String(dateOfBirth))) {
    return fail('Invalid dateOfBirth format. Use YYYY-MM-DD.', 400);
  }

  await dbConnect();

  const user = await User.findById(userId);

  if (!user) {
    logger.warn('User not found in PUT /api/user/profile', { userId });
    return fail('User not found', 404);
  }

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_OWN_PROFILE);
  if (isPermissionError(permResult)) return permResult.error;

  // Handle mainResume update
  if (mainResume !== undefined && mainResume !== null) {
    if (!isValidResumeContent(mainResume)) {
      return fail('Invalid resume content structure', 400);
    }
    const newResume = new Resume({
      userId: user._id,
      content: mainResume,
    });
    await newResume.save();
    user.mainResume = newResume._id;
  }

  if (name !== undefined) user.name = name.trim();
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
