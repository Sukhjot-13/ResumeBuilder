import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { CoverLetterService } from '@/services/coverLetterService';
import { success, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request, context) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetterService.getCoverLetterById(id, userId);
  if (!letter) return fail('Cover letter not found', 404);

  return success(letter);
});

export const DELETE = withErrorHandler(async (request, context) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetterService.deleteCoverLetter(id, userId);
  if (!letter) return fail('Cover letter not found', 404);

  return success(null, 'Cover letter deleted');
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

  const letter = await CoverLetterService.updateCoverLetter(id, userId, {
    content: body.content,
    metadata: body.metadata,
  });

  if (!letter) return fail('Cover letter not found', 404);

  return success(letter, 'Cover letter updated');
});
