import dbConnect from '@/lib/mongodb';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { CoverLetterService } from '@/services/coverLetterService';
import { ok, success, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request, context) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetterService.getCoverLetterById(id, userId);
  if (!letter) return fail('Cover letter not found', 404);

  return ok(letter);
});

export const DELETE = withErrorHandler(async (request, context) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const { id } = await context.params;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DELETE_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetterService.deleteCoverLetter(id, userId);
  if (!letter) return fail('Cover letter not found', 404);

  return success(null, 'Cover letter deleted');
});

export const PATCH = withErrorHandler(async (request, context) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const { id } = await context.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.EDIT_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  const letter = await CoverLetterService.updateCoverLetter(id, userId, {
    content: body.content,
    metadata: body.metadata,
  });

  if (!letter) return fail('Cover letter not found', 404);

  return success(letter, 'Cover letter updated');
});
