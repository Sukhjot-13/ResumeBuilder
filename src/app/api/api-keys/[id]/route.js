import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import ApiKey from '@/models/ApiKey';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const DELETE = withErrorHandler(async (request, { params }) => {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;
  await dbConnect();
  const perm = await requirePermission(userId, PERMISSIONS.MANAGE_API_KEYS);
  if (isPermissionError(perm)) return perm.error;

  const { id } = await params;
  const key = await ApiKey.findOne({ _id: id, userId });
  if (!key) {
    return fail('API key not found', 404);
  }

  key.isActive = false;
  key.revokedAt = new Date();
  await key.save();

  return ok({ message: 'API key revoked' });
});
