import { generateResume } from '@/lib/resume-generator';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { authenticateRequest } from '@/lib/apiKeyAuth';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import { checkPermission } from '@/lib/accessControl';
import User from '@/models/User';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';

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
  return sanitized.slice(0, 8000);
}

/**
 * Resolve user from API key (Worker) or x-user-id header (web UI).
 */
async function resolveUser(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = await authenticateRequest(request);
    if (auth.error) return { error: auth.error };
    return { userId: auth.user._id.toString(), user: auth.user };
  }
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return { error: fail('Unauthorized', 401) };
  }
  return { userId };
}

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const resolved = await resolveUser(request);
  if (resolved.error) return resolved.error;
  const { userId } = resolved;

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_RESUME);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { resume, jobDescription, specialInstructions: rawSpecialInstructions } = body;
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return fail('Job description is required', 400);
  }

  const user = await User.findById(userId).select('role').lean();
  if (!user) {
    return fail('User not found', 404);
  }

  const userRole = user.role;
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
    const tailoredData = await generateResume(
      resume,
      cleanJobDescription,
      specialInstructions,
      userRole
    );

    logger.info('Resume content generated successfully', { userId, role: userRole });
    return ok(tailoredData);
  } catch (error) {
    logger.error('Error generating content', error, { userId });
    return fail(error.message || 'Error generating content', 500);
  }
});
