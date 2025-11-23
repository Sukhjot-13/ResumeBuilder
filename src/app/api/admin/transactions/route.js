import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import { verifyToken } from '@/lib/utils';
import { ROLES } from '@/lib/constants';

export async function GET(req) {
  try {
    // Verify admin access
    let token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      token = req.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token, 'access');
    await dbConnect();

    const user = await User.findById(payload.userId);
    if (!user || user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build query
    const query = {};
    if (userId) query.user = userId;
    if (status) query.status = status;

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Transaction.countDocuments(query);

    return NextResponse.json({
      transactions,
      total,
      limit,
      skip,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
