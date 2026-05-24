import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAndDowngradeExpiredSubscription } from '@/lib/subscriptionChecker';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return fail('Unauthorized', 401);
  }

  await dbConnect();

  const user = await User.findById(userId);
  if (!user) {
    return fail('User not found', 404);
  }

  await checkAndDowngradeExpiredSubscription(user);

  return ok({ role: user.role, subscriptionStatus: user.subscriptionStatus });
});
