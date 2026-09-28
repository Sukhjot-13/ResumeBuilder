import { rotateRefreshToken } from '@/lib/auth';
import { getClientIp } from '@/lib/clientIp';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

export const POST = withErrorHandler(async (req) => {
  logger.debug('Token rotation requested via verify-token route');

  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.response;
  const { refreshToken } = parsed.body || {};

  if (!refreshToken) {
    return fail('Refresh token is required', 400);
  }

  const reqInfo = {
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent'),
  };

  const { newAccessToken, newRefreshToken, userId, role, refreshTokenMaxAge } =
    await rotateRefreshToken(refreshToken, reqInfo);

  return ok({ newAccessToken, newRefreshToken, userId, role, refreshTokenMaxAge });
});
