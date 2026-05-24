import { rotateRefreshToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  logger.debug('Token rotation requested via verify-token route');

  const { refreshToken } = await req.json();

  if (!refreshToken) {
    return fail('Refresh token is required', 400);
  }

  const reqInfo = {
    ip: req.headers.get('x-forwarded-for') || req.ip,
    userAgent: req.headers.get('user-agent'),
  };

  const { newAccessToken, newRefreshToken, userId } = await rotateRefreshToken(refreshToken, reqInfo);

  return ok({ newAccessToken, newRefreshToken, userId });
});
