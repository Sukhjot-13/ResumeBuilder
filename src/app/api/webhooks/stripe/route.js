import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import Plan from '@/models/plan';
import dbConnect from '@/lib/mongodb';
import { PLANS } from '@/lib/constants';

export async function POST(req) {
  const body = await req.text();
  const signature = headers().get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  await dbConnect();

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const userId = session.metadata.userId;
    const planName = session.metadata.planName; // e.g., 'PRO'

    if (userId && planName) {
      const planDetails = PLANS[planName];
      
      // Find or create Plan document if needed, or just use constants logic
      // For now, we update User directly
      
      await User.findByIdAndUpdate(userId, {
        subscriptionId,
        customerId,
        role: 99, // SUBSCRIBER
        credits: planDetails.credits,
        // You might want to store the Plan ObjectId if you use the Plan model strictly
      });
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    
    // Retrieve subscription to get plan details if needed
    // For recurring payments, reset credits
    
    const user = await User.findOne({ subscriptionId });
    if (user) {
       // Reset credits based on their plan
       // Assuming PRO plan for now if they have a subscription
       user.credits = PLANS.PRO.credits;
       await user.save();
    }
  }

  return NextResponse.json({ received: true });
}
