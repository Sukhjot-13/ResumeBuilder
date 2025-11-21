import { NextResponse } from 'next/server';
import User from '@/models/User';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';

export async function POST(req, { params }) {
  try {
    // 1. Verify Admin Access
    const accessToken = req.cookies.get('accessToken')?.value;
    const auth = await verifyAuthEdge({ accessToken });

    if (!auth.ok || auth.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { amount } = await req.json();

    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 2. Update User Credits
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.credits += amount;
    await user.save();

    return NextResponse.json({ success: true, credits: user.credits });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
