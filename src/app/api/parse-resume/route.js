import { parseResume } from '../../../services/resumeParsingService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';

// Disable Next.js body parser for this route
export const bodyParser = false;

export async function POST(request) {
  const userId = request.headers.get('x-user-id');

  await dbConnect();

  // Check permission using standardized helper
  const permResult = await requirePermission(userId, PERMISSIONS.PARSE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    const formData = await request.formData();
    const file = formData.get('resumeFile');

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const parsedData = await parseResume(file);
    logger.info("Resume parsed successfully", { userId });
    return new Response(JSON.stringify(parsedData), { status: 200 });

  } catch (error) {
    logger.error('Error in POST /api/parse-resume', error, { userId });
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}