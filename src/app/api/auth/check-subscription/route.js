import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkAndDowngradeExpiredSubscription } from '@/lib/subscriptionChecker';

export async function POST(req) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check and downgrade if subscription expired
    await checkAndDowngradeExpiredSubscription(user);

    // Return the current user role (might have been updated)
    return NextResponse.json({ role: user.role, subscriptionStatus: user.subscriptionStatus });
  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
