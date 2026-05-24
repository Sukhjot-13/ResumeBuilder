import { stripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/utils';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { ROLES, PLANS } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return fail('Session ID is required', 400);
  }

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

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    return fail('Session not found', 404);
  }

  if (session.payment_status !== 'paid') {
    return fail('Payment not completed', 400);
  }

  if (session.metadata.userId !== userId) {
    return fail('Unauthorized session', 403);
  }

  const planName = session.metadata.planName;
  const subscriptionId = session.subscription;
  const customerId = session.customer;

  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 1);

  const updatedUser = await User.findByIdAndUpdate(userId, {
    subscriptionId,
    customerId,
    role: ROLES.SUBSCRIBER,
    subscriptionExpiresAt: expiryDate,
    subscriptionStatus: 'active',
    creditsUsed: 0,
    lastCreditResetDate: new Date(),
  }, { new: true });

  const existingTransaction = await Transaction.findOne({ stripePaymentId: session.payment_intent || session.id });

  if (!existingTransaction) {
    await Transaction.create({
      user: userId,
      stripePaymentId: session.payment_intent || session.id,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      amount: session.amount_total,
      currency: session.currency,
      status: 'completed',
      planName: planName,
      type: 'subscription',
      metadata: {
        sessionId: session.id,
        verificationMethod: 'api_fallback',
      },
    });
  }

  return ok({ user: updatedUser });
});
