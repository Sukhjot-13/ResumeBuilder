import { requirePermission, isPermissionError, isValidObjectId } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { isRootAdmin } from '@/lib/accessControl';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req, { params }) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return fail('Invalid user id', 400);
  }

  const permResult = await requirePermission(userId, PERMISSIONS.MANAGE_CREDITS);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user: actor } = permResult;

  const user = await User.findById(id);
  if (!user) {
    return fail('User not found', 404);
  }

  if (!isRootAdmin(actor) && Number.isInteger(user.role) && user.role < actor.role) {
    return fail('You cannot reset credits for an account with higher authority than your own.', 403);
  }

  const previousCreditsUsed = user.creditsUsed || 0;
  user.creditsUsed = 0;
  await user.save();

  await recordAuthorizationEvent({
    actorId: userId,
    actorRole: actor.role,
    action: 'user.credits.reset',
    targetType: 'User',
    targetId: id,
    before: { creditsUsed: previousCreditsUsed },
    after: { creditsUsed: 0 },
    request: req,
  });

  return ok({ creditsUsed: 0 });
});

