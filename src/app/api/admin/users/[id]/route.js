import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import CoverLetter from '@/models/CoverLetter';
import RefreshToken from '@/models/refreshToken';
import ApiKey from '@/models/ApiKey';
import { getStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';

export const DELETE = withErrorHandler(async (req, { params }) => {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  await dbConnect();

  const permResult = await requirePermission(adminId, PERMISSIONS.ACCESS_ADMIN_PANEL);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  if (adminId === id) {
    return fail('Cannot delete your own account', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

  // Cancel an active Stripe subscription so billing actually stops
  if (user.subscriptionId && user.subscriptionStatus === 'active') {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(user.subscriptionId);
      logger.info('Stripe subscription cancelled on user deletion', { userId: id });
    } catch (err) {
      // Already canceled or not found — continue with deletion
      logger.warn('Could not cancel Stripe subscription during user deletion', err, { userId: id });
    }
  }

  // Cascade-delete owned data
  await Promise.all([
    Resume.deleteMany({ userId: id }),
    ResumeMetadata.deleteMany({ userId: id }),
    CoverLetter.deleteMany({ userId: id }),
    RefreshToken.deleteMany({ userId: id }),
    ApiKey.deleteMany({ userId: id }),
  ]);

  await User.findByIdAndDelete(id);

  logger.info('User deleted with all dependent records', { adminId, deletedUser: id });
  return ok(null);
});
