import { resolveUserId } from '@/lib/apiKeyAuth';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { ROLES, PLANS } from '@/lib/constants';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  if (!userId) {
    return fail('Unauthorized', 401);
  }

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { sessionId } = parsed.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return fail('Session ID is required', 400);
  }

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

  // Derive expiry from the Stripe subscription (falls back to +1 month)
  let expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      if (sub?.current_period_end) {
        expiryDate = new Date(sub.current_period_end * 1000);
      }
    } catch (err) {
      // keep fallback
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, {
    subscriptionId,
    customerId,
    role: ROLES.SUBSCRIBER,
    subscriptionExpiresAt: expiryDate,
    subscriptionStatus: 'active',
    creditsUsed: 0,
    lastCreditResetDate: new Date(),
  }, { new: true }).select('-otp -otpExpires');

  // Idempotent — prevents duplicates when racing the webhook handler
  await Transaction.findOneAndUpdate(
    { stripePaymentId: session.payment_intent || session.id },
    {
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return ok({ user: updatedUser });
});
