import { requirePermission, isPermissionError, isValidObjectId } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { isRootAdmin } from '@/lib/accessControl';
import User from '@/models/User';
import Resume from '@/models/resume';
import ResumeMetadata from '@/models/resumeMetadata';
import CoverLetter from '@/models/CoverLetter';
import RefreshToken from '@/models/refreshToken';
import ApiKey from '@/models/ApiKey';
import { getStripe } from '@/lib/stripe';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';

// Destructive, irreversible, cascade-deleting action. DELETE_USER is held only
// by root ADMIN — ACCESS_ADMIN_PANEL (developer-tier) is deliberately NOT
// sufficient, otherwise any DEVELOPER could wipe any account.
async function handleDelete(req, { params }) {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  const permResult = await requirePermission(adminId, PERMISSIONS.DELETE_USER);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user: actor } = permResult;

  if (!isValidObjectId(id)) {
    return fail('Invalid user id', 400);
  }

  await dbConnect();

  if (adminId === id) {
    return fail('Cannot delete your own account', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

  // A non-root caller may never delete an account that outranks them.
  if (!isRootAdmin(actor) && Number.isInteger(user.role) && user.role < actor.role) {
    await recordAuthorizationEvent({
      actorId: adminId,
      actorRole: actor.role,
      action: 'user.delete.denied',
      targetType: 'User',
      targetId: id,
      outcome: 'denied',
      after: { code: 'RANK_CEILING_EXCEEDED', targetRole: user.role },
      request: req,
    });
    return fail('You cannot delete an account with higher authority than your own.', 403);
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

  await recordAuthorizationEvent({
    actorId: adminId,
    actorRole: actor.role,
    action: 'user.deleted',
    targetType: 'User',
    targetId: id,
    before: { role: user.role, subscriptionStatus: user.subscriptionStatus },
    request: req,
  });

  logger.info('User deleted with all dependent records', { adminId, deletedUser: id });
  return ok(null);
}

export const DELETE = withErrorHandler(handleDelete);

