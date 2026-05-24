import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { verifyToken } from '@/lib/utils';
import { ROLES } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  let token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) {
    token = req.cookies.get('accessToken')?.value;
  }

  if (!token) {
    return fail('Unauthorized', 401);
  }

  const payload = await verifyToken(token, 'access');
  await dbConnect();

  const user = await User.findById(payload.userId);
  if (!user || user.role !== ROLES.ADMIN) {
    return fail('Forbidden - Admin access required', 403);
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = parseInt(searchParams.get('skip') || '0');

  const query = {};
  if (userId) query.user = userId;
  if (status) query.status = status;

  const transactions = await Transaction.find(query)
    .populate('user', 'email name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Transaction.countDocuments(query);

  return ok({ transactions, total, limit, skip });
});
