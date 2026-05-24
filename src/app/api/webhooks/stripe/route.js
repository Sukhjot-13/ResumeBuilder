import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { PLANS, ROLES } from '@/lib/constants';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import env from '@/config/env';

export async function POST(req) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripeWebhookSecret,
    );
    console.log('🔔 Webhook received:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return fail(`Webhook Error: ${err.message}`, 400);
  }

  await dbConnect();

  const session = event.data.object;

  if (event.type === 'checkout.session.completed') {
    console.log('💳 Processing checkout.session.completed');
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    const userId = session.metadata?.userId;
    const planName = session.metadata?.planName; // e.g., 'PRO'

    console.log('📋 Checkout metadata:', { userId, planName, subscriptionId, customerId });

    if (userId && planName) {
      const planDetails = PLANS[planName];
      
      // Calculate subscription expiry (1 month from now)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      
      console.log('💾 Updating user:', userId, 'to SUBSCRIBER role with expiry:', expiryDate.toISOString());
      
      try {
        // Update user with subscription details and set role to SUBSCRIBER
        const updatedUser = await User.findByIdAndUpdate(userId, {
          subscriptionId,
          customerId,
          role: ROLES.SUBSCRIBER, // Set to 99
          subscriptionExpiresAt: expiryDate,
          subscriptionStatus: 'active',
          creditsUsed: 0, // Reset credits on upgrade
          lastCreditResetDate: new Date(),
        }, { new: true });

        if (updatedUser) {
          console.log('✅ User updated successfully:', {
            id: updatedUser._id,
            role: updatedUser.role,
            status: updatedUser.subscriptionStatus,
            credits: updatedUser.creditsUsed
          });
        } else {
          console.error('❌ FAILED to update user: User not found with ID', userId);
        }
      } catch (dbError) {
        console.error('❌ Database error updating user:', dbError);
      }

      // Save transaction record
      const transaction = await Transaction.create({
        user: userId,
        stripePaymentId: session.payment_intent || session.id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        amount: session.amount_total, // Amount in cents
        currency: session.currency,
        status: 'completed',
        planName: planName,
        type: 'subscription',
        metadata: {
          sessionId: session.id,
          planDetails: planDetails,
        },
      });

      console.log('💰 Transaction saved:', transaction._id);
      console.log(`✅ User ${userId} upgraded to SUBSCRIBER (role 99) until ${expiryDate.toISOString()}`);
    } else {
      console.warn('⚠️ Missing userId or planName in metadata:', { userId, planName });
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const subscriptionId = session.subscription;
    const customerId = session.customer;
    
    // For recurring payments, reset subscription expiry and ensure role is SUBSCRIBER
    const user = await User.findOne({ subscriptionId });
    if (user) {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      user.subscriptionExpiresAt = expiryDate;
      user.subscriptionStatus = 'active';
      user.role = ROLES.SUBSCRIBER; // Ensure role is 99
      user.creditsUsed = 0; // Reset credits on renewal
      user.lastCreditResetDate = new Date();
      await user.save();

      // Log the renewal transaction
      await Transaction.create({
        user: user._id,
        stripePaymentId: session.payment_intent || session.id,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        amount: session.amount_paid,
        currency: session.currency,
        status: 'completed',
        planName: 'PRO',
        type: 'subscription',
        metadata: {
          renewalDate: new Date(),
        },
      });

      console.log(`✅ User ${user._id} subscription renewed until ${expiryDate.toISOString()}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscriptionId = session.id;
    
    // Mark subscription as canceled
    const user = await User.findOne({ subscriptionId });
    if (user) {
      user.subscriptionStatus = 'canceled';
      // Immediately downgrade to regular user
      user.role = ROLES.USER; // Set to 100
      await user.save();

      console.log(`❌ User ${user._id} subscription canceled, downgraded to USER (role 100)`);
    }
  }

  return ok({ received: true });
}
