
import { NextResponse } from 'next/server';
import { rotateRefreshToken } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req) {
  logger.debug('Token rotation requested via verify-token route');
  
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
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    logger.error('Token rotation failed in verify-token route', error);
    // Return generic message — never leak internal error details to client
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
