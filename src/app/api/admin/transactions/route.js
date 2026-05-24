import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  const permResult = await requirePermission(userId, PERMISSIONS.ACCESS_ADMIN_PANEL);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  await dbConnect();

  const { searchParams } = new URL(req.url);
  const queryUserId = searchParams.get('userId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');

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
