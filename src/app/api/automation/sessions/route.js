import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import PlatformSession from '@/models/PlatformSession';
import { encrypt } from '@/lib/encryption';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_PLATFORM_SESSIONS);
  if (isPermissionError(perm)) return perm.error;

  const sessions = await PlatformSession.find({ userId }).select('platform lastRefreshed isValid cookiesEncrypted createdAt');
  return ok(sessions);
});

export const POST = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_PLATFORM_SESSIONS);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { platform, cookies } = body;
  if (!platform || !cookies) {
    return fail('platform and cookies are required', 400);
  }
  if (!['linkedin', 'indeed'].includes(platform)) {
    return fail('platform must be linkedin or indeed', 400);
  }

  const encrypted = encrypt(JSON.stringify(cookies));

  await PlatformSession.findOneAndUpdate(
    { userId, platform },
    {
      cookiesEncrypted: encrypted,
      lastRefreshed: new Date(),
      isValid: true,
    },
    { upsert: true }
  );

  return ok({ message: `${platform} session saved` });
});

export const DELETE = withErrorHandler(async (request) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  const platform = request.nextUrl.searchParams.get('platform');
  if (!platform) return fail('platform query param is required', 400);

  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_PLATFORM_SESSIONS);
  if (isPermissionError(perm)) return perm.error;

  await PlatformSession.findOneAndDelete({ userId, platform });
  return ok({ message: `${platform} session removed` });
});
