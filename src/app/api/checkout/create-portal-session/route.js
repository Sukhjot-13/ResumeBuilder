import { stripe } from '@/lib/stripe';
import { resolveUserId } from '@/lib/apiKeyAuth';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import env from '@/config/env';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  await dbConnect();
  const user = await User.findById(userId);
  if (!user || !user.customerId) {
    return fail('User or customer not found', 404);
  }

  const appUrl = env.appUrl;

  // Create Stripe Portal Session
  const session = await stripe.billingPortal.sessions.create({
    customer: user.customerId,
    return_url: `${appUrl}/profile`,
  });

  return ok({ url: session.url });
});
