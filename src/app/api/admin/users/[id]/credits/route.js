import { requirePermission, isPermissionError, isValidObjectId } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { isRootAdmin } from '@/lib/accessControl';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import User from '@/models/User';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const MAX_ADJUSTMENT = 10000;

export const POST = withErrorHandler(async (req, { params }) => {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  if (!isValidObjectId(id)) {
    return fail('Invalid user id', 400);
  }

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { amount } = parsed.body || {};

  const permResult = await requirePermission(adminId, PERMISSIONS.MANAGE_CREDITS);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }
  const { user: actor } = permResult;

  // Bounded integer only — NaN/negatives/huge values could corrupt credit state
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_ADJUSTMENT) {
    return fail(`Invalid amount. Must be a non-zero integer between -${MAX_ADJUSTMENT} and ${MAX_ADJUSTMENT}.`, 400);
  }

  const existing = await User.findById(id).select('role creditsUsed').lean();
  if (!existing) {
    return fail('User not found', 404);
  }

  if (!isRootAdmin(actor) && Number.isInteger(existing.role) && existing.role < actor.role) {
    return fail('You cannot adjust credits for an account with higher authority than your own.', 403);
  }

  // Atomic adjustment clamped at zero (never allow negative creditsUsed).
  // Contract: positive amount increments usage; negative amount frees credits.
  const user = await User.findOneAndUpdate(
    { _id: id },
    [
      {
        $set: {
          creditsUsed: {
            $max: [0, { $add: [{ $ifNull: ['$creditsUsed', 0] }, amount] }],
          },
        },
      },
    ],
    { new: true }
  );

  if (!user) {
    return fail('User not found', 404);
  }

  await recordAuthorizationEvent({
    actorId: adminId,
    actorRole: actor.role,
    action: 'user.credits.adjusted',
    targetType: 'User',
    targetId: id,
    before: { creditsUsed: existing.creditsUsed ?? 0 },
    after: { creditsUsed: user.creditsUsed, amount },
    request: req,
  });

  return ok({ creditsUsed: user.creditsUsed });
});

