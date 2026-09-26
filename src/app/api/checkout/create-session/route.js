import { getStripe } from '@/lib/stripe';
import User from '@/models/User';
import { PLANS } from '@/lib/constants';
import { resolvePlanKey } from '@/lib/planResolver';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';
import env from '@/config/env';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    logger.warn('Stripe checkout attempted without STRIPE_SECRET_KEY', { userId });
    return fail('Billing is not configured. Please try again later.', 503);
  }

  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.response;
    const { planName } = parsed.body || {}; // plan KEY, e.g. 'PRO' (display names like 'Pro' also accepted)

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return fail('User not found', 404);
    }

    // Resolve the plan from either its key ('PRO') or display name ('Pro'), case-insensitively
    const planKey = resolvePlanKey(planName);

    if (!planKey) {
      return fail('Invalid plan', 400);
    }

    // Only PRO is purchasable — FREE is the default tier, never a checkout product
    if (planKey !== 'PRO') {
      return fail('This plan is not available for purchase', 400);
    }

    const selectedPlan = PLANS[planKey];
    const appUrl = env.appUrl;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: selectedPlan.currency,
            product_data: {
              name: `${selectedPlan.name} Plan`,
              description: `${selectedPlan.credits} credits per ${selectedPlan.interval}`,
            },
            unit_amount: Math.round(selectedPlan.price * 100), // Amount in cents
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        planName: planKey, // always the canonical KEY ('PRO') so webhook/verify checks match
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planName: planKey,
        },
      },
    });

    logger.info('Stripe checkout session created', { userId, planKey });
    return ok({ url: session.url });
  } catch (error) {
    logger.error('Stripe Checkout Error', error, { userId });
    return fail('Internal Server Error', 500);
  }
});
