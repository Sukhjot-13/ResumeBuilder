
import { NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth';

export async function POST(req) {
  console.log('--- In verify-token route ---');
  
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 });
    }

    const reqInfo = {
      ip: req.headers.get('x-forwarded-for') || req.ip,
      userAgent: req.headers.get('user-agent'),
    };
    
    const { newAccessToken, newRefreshToken, userId } = await rotateRefreshToken(refreshToken, reqInfo);

    return NextResponse.json({ newAccessToken, newRefreshToken, userId });

  } catch (error) {
    // Catch errors from JSON parsing or from rotateRefreshToken
    console.error('Error in verify-token route:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    // `rotateRefreshToken` throws errors for specific cases.
    // A 401 status is appropriate for auth failures.
    return NextResponse.json({ error: error.message || 'Token verification failed' }, { status: 401 });
  }
}
