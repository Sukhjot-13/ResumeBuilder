import { NextResponse } from 'next/server';
import User from '@/models/User';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';

import dbConnect from '@/lib/mongodb';

export async function PATCH(req, { params }) {
  await dbConnect();
  try {
    // 1. Verify Admin Access
    const accessToken = req.cookies.get('accessToken')?.value;
    const auth = await verifyAuthEdge({ accessToken });

    if (!auth.ok || auth.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { role } = await req.json();

    if (typeof role !== 'number') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 2. Update User
    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
