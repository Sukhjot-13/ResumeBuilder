import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/utils';
import User from '@/models/User';
import Transaction from '@/models/Transaction';
import dbConnect from '@/lib/mongodb';
import { ROLES, PLANS } from '@/lib/constants';

export async function POST(req) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Verify user
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token, 'access');
    const userId = payload.userId;

    await dbConnect();
    
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify payment status
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Verify user matches
    if (session.metadata.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized session' }, { status: 403 });
    }

    const planName = session.metadata.planName;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Calculate subscription expiry (1 month from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    console.log('💾 Verifying and updating user:', userId, 'to SUBSCRIBER role');

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, {
        subscriptionId,
        customerId,
        role: ROLES.SUBSCRIBER, // Set to 99
        subscriptionExpiresAt: expiryDate,
        subscriptionStatus: 'active',
        creditsUsed: 0, // Reset credits on upgrade
        lastCreditResetDate: new Date(),
    }, { new: true });

    // Check if transaction already exists to avoid duplicates
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
        console.log('💰 Transaction saved via verification API');
    }

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error('Verification Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
