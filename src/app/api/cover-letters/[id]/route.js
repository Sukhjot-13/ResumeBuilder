import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import CoverLetter from '@/models/CoverLetter';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request, context) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetter.findOne({ _id: id, userId }).lean();
  if (!letter) return fail('Cover letter not found', 404);

  return ok(letter);
});

export const DELETE = withErrorHandler(async (request, context) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetter.findOneAndDelete({ _id: id, userId });
  if (!letter) return fail('Cover letter not found', 404);

  return ok(null, 'Cover letter deleted');
});

export const PATCH = withErrorHandler(async (request, context) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  const { id } = await context.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const update = {};
  if (body.content) update.content = body.content;
  if (body.metadata) update.metadata = body.metadata;

  const letter = await CoverLetter.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true }
  );

  if (!letter) return fail('Cover letter not found', 404);

  return ok(letter, 'Cover letter updated');
});
