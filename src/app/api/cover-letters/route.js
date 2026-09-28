import dbConnect from '@/lib/mongodb';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { CoverLetterService } from '@/services/coverLetterService';
import { SubscriptionService } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';
import { ok, success, fail, withErrorHandler, readJson } from '@/lib/apiResponse';

const COVER_LETTER_CREDIT_COST = 1;

export const GET = withErrorHandler(async (request) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.VIEW_COVER_LETTERS);
  if (isPermissionError(permResult)) return permResult.error;

  const letters = await CoverLetterService.getCoverLettersByUserId(userId);
  return ok(letters);
});

export const POST = withErrorHandler(async (request) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;

  const { content, metadata } = parsed.body || {};
  if (!content) {
    return fail('Cover letter content is required', 400);
  }

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_COVER_LETTER);
  if (isPermissionError(permResult)) return permResult.error;

  // Persisting a cover letter is an AI-backed write, so it is metered exactly
  // like POST /api/generate-cover-letter instead of being a free extra route.
  const tracked = await SubscriptionService.trackUsage(userId, COVER_LETTER_CREDIT_COST);
  if (!tracked) {
    logger.info('User attempted to save a cover letter without credits', { userId });
    return fail('Insufficient credits. Please upgrade your plan.', 403);
  }

  try {
    const doc = await CoverLetterService.createCoverLetter(userId, content, metadata);
    return success(doc, 'Cover letter saved', 201);
  } catch (err) {
    await SubscriptionService.refundUsage(userId, COVER_LETTER_CREDIT_COST);
    throw err;
  }
});
