import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import { PLANS } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import env from '@/config/env';

export const POST = withErrorHandler(async (req) => {
  const { userId, error } = await resolveUserId(req);
  if (error) return error;

  try {
    const { planName } = await req.json(); // e.g., 'PRO'

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return fail('User not found', 404);
    }

    const selectedPlan = PLANS[planName];
    if (!selectedPlan) {
      return fail('Invalid plan', 400);
    }

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
        planName: planName,
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planName: planName,
        },
      },
    });

    logger.info('Stripe checkout session created', { userId, planName });
    return ok({ url: session.url });
  } catch (error) {
    logger.error('Stripe Checkout Error', error, { userId });
    return fail('Internal Server Error', 500);
  }
});
