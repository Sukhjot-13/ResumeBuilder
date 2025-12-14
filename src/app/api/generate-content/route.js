import { NextResponse } from 'next/server';
import { generateTailoredContent } from '../../../services/contentGenerationService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');

  await dbConnect();

  // Check permission using standardized helper
  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    const { resume, jobDescription, specialInstructions } = await request.json();
    const tailoredData = await generateTailoredContent(resume, jobDescription, specialInstructions);
    
    logger.info("Resume content generated successfully", { userId });
    return NextResponse.json(tailoredData);
  } catch (error) {
    logger.error('Error generating content', error, { userId });
    return NextResponse.json({ message: error.message || 'Error generating content' }, { status: 500 });
  }
}