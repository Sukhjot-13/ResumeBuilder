import { NextResponse } from 'next/server';
import { parseResume } from '../../../services/resumeParsingService';
import { UserService } from '@/services/userService';
import { hasPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';

// Disable Next.js body parser for this route
export const bodyParser = false;

export async function POST(request) {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    logger.warn("Unauthorized access attempt to POST /api/parse-resume");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await dbConnect();
    
    // Use UserService to get user
    const user = await UserService.getUserById(userId);

    // Check permission for "Parse Resume" feature
    if (!hasPermission(user.role, PERMISSIONS.PARSE_RESUME)) {
      logger.info("Permission denied: PARSE_RESUME", { userId, role: user.role });
      return new Response("This feature requires appropriate permissions", { status: 403 });
    }

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