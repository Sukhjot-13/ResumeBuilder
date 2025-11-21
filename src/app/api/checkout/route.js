import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/utils';
import User from '@/models/User';
import { PLANS } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';

export async function POST(req) {
  try {
    const { planName } = await req.json(); // e.g., 'PRO'
    
    // Verify user
    // Note: In a real app, use a robust way to get user from session/token
    // Here we assume the client sends the access token in Authorization header
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
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const selectedPlan = PLANS[planName];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: userId.toString(),
        planName: planName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
