import { resolveUserId } from '@/lib/apiKeyAuth';
import { getStripe } from '@/lib/stripe';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { ROLES } from '@/lib/constants';
import { recordAuthorizationEvent } from '@/lib/auditLog';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';

// A subscription that was later cancelled, expired or is past due must never be
// revived from here — only the signed Stripe webhook may change that state.
const NON_REACTIVATABLE_STATUSES = new Set([
  'canceled',
  'expired',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
]);

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

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

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    logger.warn('Stripe session verification attempted without STRIPE_SECRET_KEY', { userId });
    return fail('Billing is not configured. Please try again later.', 503);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    return fail('Session not found', 404);
  }

  if (session.payment_status !== 'paid') {
    return fail('Payment not completed', 400);
  }

  if (session.metadata?.userId !== userId) {
    return fail('Unauthorized session', 403);
  }

  const planName = session.metadata?.planName;
  if (planName !== 'PRO') {
    // Only PRO subscriptions can be activated — never upgrade for other/unknown plans
    logger.warn('Session verified for non-PRO plan — refusing upgrade', { userId, planName });
    return fail('Invalid plan', 400);
  }
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  const paymentKey = session.payment_intent || session.id;

  // SINGLE-USE: the Transaction row is both the billing record and the
  // consumption marker. Without this a paying user could re-POST their own
  // session id forever and reset entitlements on every call.
  const consumed = await Transaction.findOne({ stripePaymentId: paymentKey }).select('_id').lean();
  if (consumed) {
    await recordAuthorizationEvent({
      actorId: userId,
      action: 'subscription.upgrade.replay_blocked',
      targetType: 'Subscription',
      targetId: String(paymentKey),
      outcome: 'denied',
      after: { reason: 'session_already_consumed' },
      request: req,
    });
    return fail('This checkout session has already been used.', 409);
  }

  const user = await User.findById(userId).select('role subscriptionStatus');
  if (!user) {
    return fail('User not found', 404);
  }

  if (NON_REACTIVATABLE_STATUSES.has(user.subscriptionStatus)) {
    await recordAuthorizationEvent({
      actorId: userId,
      action: 'subscription.upgrade.denied',
      targetType: 'User',
      targetId: String(userId),
      outcome: 'denied',
      after: { reason: 'subscription_not_reactivatable', status: user.subscriptionStatus },
      request: req,
    });
    return fail('Your subscription is not in a state that can be upgraded here.', 409);
  }

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

  // Claim the session BEFORE mutating the account so a concurrent replay loses
  // the unique index instead of racing the upgrade.
  let transaction;
  try {
    transaction = await Transaction.create({
      user: userId,
      stripePaymentId: paymentKey,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      amount: session.amount_total,
      currency: session.currency,
      status: 'completed',
      planName,
      type: 'subscription',
      metadata: {
        sessionId: session.id,
        verificationMethod: 'api_fallback',
      },
    });
  } catch (txErr) {
    if (isDuplicateKeyError(txErr)) {
      return fail('This checkout session has already been used.', 409);
    }
    throw txErr;
  }

  try {
    // NOTE: creditsUsed is intentionally NOT reset — a plan upgrade must never
    // refund credits the user already spent.
    const updatedUser = await User.findByIdAndUpdate(userId, {
      subscriptionId,
      customerId,
      role: ROLES.SUBSCRIBER,
      subscriptionExpiresAt: expiryDate,
      subscriptionStatus: 'active',
    }, { new: true }).select('-otp -otpExpires');

    if (!updatedUser) {
      throw new Error('User disappeared during upgrade');
    }

    await recordAuthorizationEvent({
      actorId: userId,
      action: 'subscription.upgraded',
      targetType: 'User',
      targetId: String(userId),
      before: { role: user.role, subscriptionStatus: user.subscriptionStatus },
      after: { role: ROLES.SUBSCRIBER, subscriptionStatus: 'active', expiresAt: expiryDate },
      request: req,
    });

    return ok({ user: updatedUser });
  } catch (upgradeErr) {
    // Release the marker so a genuine retry can still succeed.
    await Transaction.deleteOne({ _id: transaction._id }).catch(() => {});
    throw upgradeErr;
  }
});
