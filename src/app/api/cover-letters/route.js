import dbConnect from '@/lib/mongodb';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import CoverLetter from '@/models/CoverLetter';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

export const GET = withErrorHandler(async (request) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const letters = await CoverLetter.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return ok(letters);
});

export const POST = withErrorHandler(async (request) => {
  const userId = request.headers.get('x-user-id');
  if (!userId) return fail('Unauthorized', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { content, metadata } = body;
  if (!content) {
    return fail('Cover letter content is required', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  const doc = await CoverLetter.create({
    userId,
    content,
    metadata: metadata || {},
  });

  return ok(doc, 'Cover letter saved', 201);
});
