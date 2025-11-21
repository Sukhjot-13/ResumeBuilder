import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/utils';
import { ROLES } from '@/lib/constants';

export async function GET(req) {
  // Middleware already protects /admin, but good to double check or get user info
  const authHeader = req.headers.get('authorization');
  // Note: Middleware runs before this, but doesn't set req.user unless we modify headers.
  // We can re-verify token or trust middleware if it blocks non-admins.
  // For safety, let's verify again or rely on middleware's protection.
  // Since middleware redirects non-admins, we can assume safety if configured correctly.
  // But for API routes, middleware might not run if not matched correctly?
  // Middleware config matches '/admin/:path*', so this route '/api/admin/users' MIGHT NOT be matched if it's not under /admin in URL?
  // Wait, file path is src/app/api/admin/users/route.js -> URL is /api/admin/users.
  // Middleware matcher is ['/admin/:path*'].
  // /api/admin/users does NOT start with /admin.
  // I need to update middleware matcher or add check here.
  
  // Let's add check here for safety.
  const token = req.cookies.get('accessToken')?.value || req.headers.get('authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token, 'access');
    if (payload.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find({}).select('-password -otp -otpExpires').sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
