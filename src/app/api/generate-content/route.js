import { NextResponse } from 'next/server';
import { generateTailoredContent } from '../../../services/contentGenerationService';
import { hasPermission } from '@/lib/accessControl';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    logger.warn("Unauthorized access attempt to POST /api/generate-content");
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findById(userId);
    
    if (!user) {
      logger.warn("User not found in POST /api/generate-content", { userId });
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check permission for "Generate Resume" feature
    if (!hasPermission(user.role, PERMISSIONS.GENERATE_RESUME)) {
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