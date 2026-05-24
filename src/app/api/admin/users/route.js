import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/utils';
import { ROLES } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (req) => {
  const token = req.cookies.get('accessToken')?.value || req.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return fail('Unauthorized', 401);
  }

  const payload = await verifyToken(token, 'access');
  if (payload.role !== ROLES.ADMIN) {
    return fail('Forbidden', 403);
  }

  await dbConnect();
  const users = await User.find({}).select('-password -otp -otpExpires').sort({ createdAt: -1 });
  return ok({ users });
});
