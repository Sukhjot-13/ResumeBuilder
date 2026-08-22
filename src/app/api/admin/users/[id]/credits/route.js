import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import User from '@/models/User';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const MAX_ADJUSTMENT = 10000;

export const POST = withErrorHandler(async (req, { params }) => {
  const { userId: adminId, error } = await resolveUserId(req);
  if (error) return error;
  const { id } = await params;

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { amount } = parsed.body || {};

  const permResult = await requirePermission(adminId, PERMISSIONS.MANAGE_CREDITS);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  // Bounded integer only — NaN/negatives/huge values could corrupt credit state
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_ADJUSTMENT) {
    return fail(`Invalid amount. Must be a non-zero integer between -${MAX_ADJUSTMENT} and ${MAX_ADJUSTMENT}.`, 400);
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

  return ok({ creditsUsed: user.creditsUsed });
});
