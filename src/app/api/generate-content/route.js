import { NextResponse } from 'next/server';
import { generateTailoredContent } from '../../../services/contentGenerationService';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import { checkPermission } from '@/lib/accessControl';
import User from '@/models/User';

// ---------------------------------------------------------------------------
// Prompt-injection sanitizer for the job description field
// Strips common patterns users might embed to hijack the AI prompt.
// ---------------------------------------------------------------------------

/** Patterns that look like injected instructions */
const INJECTION_PATTERNS = [
  /\[.*?(ignore|disregard|forget|override|system|instruction|task|prompt|jailbreak).*?\]/gi,
  /<\s*(system|instruction|prompt|task|override)\s*>/gi,
  /###\s*(system|instruction|override|ignore)/gi,
  /you\s+are\s+now\s+/gi,
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instruction|prompt|rule)/gi,
  /forget\s+(everything|all)\s+/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(a\s+)?/gi,
];

function sanitizeJobDescription(text) {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }
  // Trim to a reasonable max length to avoid token abuse
  return sanitized.slice(0, 8000);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request) {
  const userId = request.headers.get('x-user-id');

  await dbConnect();

  // Permission: user must be able to generate a resume
  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { resume, jobDescription, specialInstructions: rawSpecialInstructions } = body;

  // 1. Sanitize the job description server-side (never trust client input)
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
  }

  // 2. Fetch the user's role so we can:
  //    a) select the right prompt tier
  //    b) enforce special instructions permission server-side
  const user = await User.findById(userId).select('role').lean();
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userRole = user.role;

  // 3. Only forward special instructions if the user actually has the permission.
  //    Even if the client sends them, we ignore them for users without access.
  const hasSpecialInstructionsPermission = checkPermission(
    { role: userRole },
    PERMISSIONS.USE_SPECIAL_INSTRUCTIONS
  );
  const specialInstructions = hasSpecialInstructionsPermission
    ? (rawSpecialInstructions || '')
    : '';

  if (rawSpecialInstructions && !hasSpecialInstructionsPermission) {
    logger.warn('User attempted to use special instructions without permission', { userId });
  }

  try {
    const tailoredData = await generateTailoredContent(
      resume,
      cleanJobDescription,
      specialInstructions,
      userRole
    );

    logger.info('Resume content generated successfully', { userId, role: userRole });
    return NextResponse.json(tailoredData);
  } catch (error) {
    logger.error('Error generating content', error, { userId });
    return NextResponse.json(
      { message: error.message || 'Error generating content' },
      { status: 500 }
    );
  }
}