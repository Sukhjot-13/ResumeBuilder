import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_SKIP = 10000;

export const GET = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  const permResult = await requirePermission(userId, PERMISSIONS.ACCESS_ADMIN_PANEL);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get('userId');
  const status = searchParams.get('status');

  // Clamped so a caller cannot request an unbounded page off the collection.
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '', 10);
  const requestedSkip = Number.parseInt(searchParams.get('skip') || '', 10);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = Math.min(
    Math.max(Number.isFinite(requestedSkip) && requestedSkip > 0 ? requestedSkip : 0, 0),
    MAX_SKIP
  );

  const query = {};
  if (queryUserId) query.user = queryUserId;
  if (status) query.status = status;

  const transactions = await Transaction.find(query)
    .populate('user', 'email name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Transaction.countDocuments(query);

  return ok({ transactions, total, limit, skip });
});
