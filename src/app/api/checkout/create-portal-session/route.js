import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/utils';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';

export async function POST(req) {
  try {
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
    const user = await User.findById(userId);
    if (!user || !user.customerId) {
      return NextResponse.json({ error: 'User or customer not found' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.customerId,
      return_url: `${appUrl}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
