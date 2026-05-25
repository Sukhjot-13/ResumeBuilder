import { ok, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async () => {
  return ok({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
