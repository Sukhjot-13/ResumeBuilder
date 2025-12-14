import { NextResponse } from 'next/server';
import { generateTailoredContent } from '../../../services/contentGenerationService';
import { UserService } from '@/services/userService';
import { checkPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    logger.warn("Unauthorized access attempt to POST /api/generate-content");
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    
    // Use UserService to get user
    const user = await UserService.getUserById(userId);

    // Check permission for "Generate Resume" feature
    if (!checkPermission(user, PERMISSIONS.GENERATE_RESUME)) {
      logger.info("Permission denied: GENERATE_RESUME", { userId, role: user.role });
      return NextResponse.json(
        { message: 'This feature requires a Pro subscription.' },
        { status: 403 }
      );
    }

    const { resume, jobDescription, specialInstructions } = await request.json();
    const tailoredData = await generateTailoredContent(resume, jobDescription, specialInstructions);
    
    logger.info("Resume content generated successfully", { userId });
    return NextResponse.json(tailoredData);
  } catch (error) {
    logger.error('Error generating content', error, { userId });
    return NextResponse.json({ message: error.message || 'Error generating content' }, { status: 500 });
  }
}