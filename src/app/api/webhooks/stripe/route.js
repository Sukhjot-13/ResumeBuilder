import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { PLANS, ROLES } from '@/lib/constants';
import { ok, fail } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import env from '@/config/env';

// Derive expiry from the Stripe subscription itself (falls back to +1 month)
async function computeExpiry(stripe, subscriptionId) {
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (!subscriptionId) return fallback;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub?.current_period_end) {
      return new Date(sub.current_period_end * 1000);
    }
  } catch (err) {
    logger.warn('Could not retrieve subscription for expiry; using fallback', { subscriptionId });
  }
  return fallback;
}

export async function POST(req) {
  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    logger.warn('Stripe webhook received without STRIPE_SECRET_KEY configured');
    return fail('Billing is not configured', 503);
  }

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
    logger.info('Stripe webhook received', { type: event.type });
  } catch (err) {
    // Do not echo internal error details back to the caller
    logger.warn('Stripe webhook signature verification failed');
    return fail('Webhook Error: invalid signature', 400);
  }

  await dbConnect();

  try {
    const session = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const userId = session.metadata?.userId;
        const planName = session.metadata?.planName;

        if (!userId || !planName) {
          logger.warn('Checkout completed with missing metadata', { userId, planName });
          break;
        }

        // Only PRO upgrades are honored — never grant Pro for other/unknown plans
        if (planName !== 'PRO') {
          logger.warn('Checkout completed for non-PRO plan — ignoring upgrade', { userId, planName });
          break;
        }

        const planDetails = PLANS[planName];
        const expiryDate = await computeExpiry(stripe, subscriptionId);

        await User.findByIdAndUpdate(userId, {
          subscriptionId,
          customerId,
          role: ROLES.SUBSCRIBER,
          subscriptionExpiresAt: expiryDate,
          subscriptionStatus: 'active',
          creditsUsed: 0,
          lastCreditResetDate: new Date(),
        });

        // Idempotent transaction record — safe on Stripe retries
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
            planName,
            type: 'subscription',
            metadata: { sessionId: session.id, planDetails },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        logger.info('User upgraded to SUBSCRIBER', { userId, until: expiryDate.toISOString() });
        break;
      }

      case 'invoice.payment_succeeded': {
        const subscriptionId = session.subscription;

        if (!subscriptionId) break;

        const user = await User.findOne({ subscriptionId });
        if (!user) break;

        const expiryDate = await computeExpiry(stripe, subscriptionId);

        await User.findByIdAndUpdate(user._id, {
          subscriptionExpiresAt: expiryDate,
          subscriptionStatus: 'active',
          role: ROLES.SUBSCRIBER,
          creditsUsed: 0,
          lastCreditResetDate: new Date(),
        });

        await Transaction.findOneAndUpdate(
          { stripePaymentId: session.payment_intent || session.id },
          {
            user: user._id,
            stripePaymentId: session.payment_intent || session.id,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer,
            amount: session.amount_paid,
            currency: session.currency,
            status: 'completed',
            planName: 'PRO',
            type: 'subscription',
            metadata: { renewalDate: new Date().toISOString() },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        logger.info('Subscription renewed', { userId: user._id, until: expiryDate.toISOString() });
        break;
      }

      case 'invoice.payment_failed': {
        const subscriptionId = session.subscription;
        if (!subscriptionId) break;

        const user = await User.findOne({ subscriptionId });
        if (!user) break;

        // Mark past-due; actual downgrade happens when expiry passes
        await User.findByIdAndUpdate(user._id, { subscriptionStatus: 'past_due' });
        logger.warn('Payment failed — marked past due', { userId: user._id });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = session;
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (!user) break;

        const statusMap = {
          active: 'active',
          trialing: 'active',
          past_due: 'past_due',
          unpaid: 'unpaid',
          canceled: 'canceled',
        };
        const mapped = statusMap[subscription.status] || 'inactive';

        await User.findByIdAndUpdate(user._id, {
          subscriptionStatus: mapped,
          ...(subscription.current_period_end
            ? { subscriptionExpiresAt: new Date(subscription.current_period_end * 1000) }
            : {}),
        });

        logger.info('Subscription updated', { userId: user._id, status: mapped });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = session;
        const user = await User.findOne({ subscriptionId: subscription.id });
        if (!user) break;

        // Honor the paid-through period: mark canceled and let the periodic
        // subscription checker downgrade once the expiry actually passes.
        const expiryDate =
          subscription.current_period_end != null
            ? new Date(subscription.current_period_end * 1000)
            : new Date();

        await User.findByIdAndUpdate(user._id, {
          subscriptionStatus: 'canceled',
          subscriptionExpiresAt: expiryDate,
        });

        logger.info('Subscription canceled', { userId: user._id, accessUntil: expiryDate.toISOString() });
        break;
      }

      case 'checkout.session.expired': {
        logger.info('Checkout session expired — nothing to do', { sessionId: session.id });
        break;
      }

      default:
        logger.info('Unhandled Stripe event type', { type: event.type });
    }
  } catch (err) {
    // Return 500 so Stripe retries this event later; never leak internals
    logger.error('Error processing Stripe webhook', err, { type: event.type });
    return fail('Webhook processing failed', 500);
  }

  return ok({ received: true });
}
