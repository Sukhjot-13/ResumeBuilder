import { generateCoverLetter } from '@/lib/coverLetter-generator';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CoverLetter from '@/models/CoverLetter';
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

export const POST = withErrorHandler(async (request) => {
  await dbConnect();

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return fail('Unauthorized', 401);
  }

  const permResult = await requirePermission(userId, PERMISSIONS.GENERATE_COVER_LETTER);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  const { jobDescription, recipientName } = body;
  const cleanJobDescription = sanitizeJobDescription(jobDescription);

  if (!cleanJobDescription.trim()) {
    return fail('Job description is required', 400);
  }

  const user = await User.findById(userId).populate('mainResume');
  if (!user) {
    return fail('User not found', 404);
  }

  const resumeData = user.mainResume?.content || {};
  const userName = user.name || '';
  const userEmail = user.email || '';

  try {
    const coverLetterData = await generateCoverLetter(
      resumeData,
      cleanJobDescription,
      { recipientName, userName, userEmail }
    );

    let coverLetterId = null;
    try {
      const doc = await CoverLetter.create({
        userId: user._id,
        content: coverLetterData,
        metadata: {
          jobTitle: coverLetterData.jobTitle || '',
          companyName: coverLetterData.companyName || '',
          coverLetterName: `Cover Letter - ${coverLetterData.companyName || 'Unknown'}`,
        },
      });
      coverLetterId = doc._id.toString();
    } catch (saveErr) {
      logger.error('Failed to save cover letter document', saveErr, { userId });
    }

    logger.info('Cover letter generated successfully', { userId });
    return ok({ coverLetterId, ...coverLetterData });
  } catch (error) {
    logger.error('Error generating cover letter', error, { userId });
    return fail(error.message || 'Error generating cover letter', 500);
  }
});
