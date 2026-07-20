import { parseResume } from '../../../services/resumeParsingService';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';

// Disable Next.js body parser for this route (handles multipart form data)
export const bodyParser = false;

export const POST = withErrorHandler(async (request) => {
  const resolved = await resolveUserId(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  await dbConnect();

  // Check permission using standardized helper
  const permResult = await requirePermission(userId, PERMISSIONS.PARSE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const formData = await request.formData();
  const file = formData.get('resumeFile');

  if (!file) {
    return fail('No file uploaded', 400);
  }

  const parsedData = await parseResume(file);
  logger.info("Resume parsed successfully", { userId });
  return ok(parsedData);
});
