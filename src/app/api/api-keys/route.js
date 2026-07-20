import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { resolveUserId, generateApiKey } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import ApiKey from '@/models/ApiKey';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_API_KEYS);
  if (isPermissionError(perm)) return perm.error;

  const keys = await ApiKey.find({ userId, revokedAt: null, isActive: true })
    .select('name keyPrefix isActive lastUsedAt expiresAt createdAt')
    .sort({ createdAt: -1 });

  return ok(keys);
});

export const POST = withErrorHandler(async (request) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_API_KEYS);
  if (isPermissionError(perm)) return perm.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { name } = body;
  if (!name || typeof name !== 'string') {
    return fail('name is required', 400);
  }

  const { plainKey, hashedKey, keyPrefix } = generateApiKey();

  await ApiKey.create({
    userId,
    name,
    key: hashedKey,
    keyPrefix,
  });

  return ok({
    key: plainKey,
    keyPrefix,
    name,
    message: 'Save this key — it will not be shown again.',
  });
});
