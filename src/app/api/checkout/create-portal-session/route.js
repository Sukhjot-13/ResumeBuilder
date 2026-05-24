import { stripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/utils';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import env from '@/config/env';

export const POST = withErrorHandler(async (req) => {
  try {
    // Verify user
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }

    if (!token) {
      return fail('Unauthorized', 401);
    }
    const payload = await verifyToken(token, 'access');
    const userId = payload.userId;

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
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return fail('Internal Server Error', 500);
  }
});
