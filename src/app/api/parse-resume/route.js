import { parseResume } from '../../../services/resumeParsingService';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { ok, fail, withErrorHandler } from '@/lib/apiResponse';
import dbConnect from '@/lib/mongodb';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// PDF/DOCX magic bytes for content-type verification (MIME headers are client-controlled)
const MAGIC_SIGNATURES = [
  { bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP container (.docx)
];

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

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return fail('Invalid form data', 400);
  }

  const file = formData.get('resumeFile');

  if (!file || typeof file === 'string') {
    return fail('No file uploaded', 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    logger.warn('Resume upload rejected: file too large', { userId, size: file.size });
    return fail('File too large. Maximum size is 5MB.', 413);
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return fail('Unsupported file type. Please upload a PDF or DOCX file.', 415);
  }

  // Verify actual file content matches an allowed type
  const buffer = Buffer.from(await file.arrayBuffer());
  const headerMatches = MAGIC_SIGNATURES.some((sig) =>
    sig.bytes.every((byte, i) => buffer[i] === byte)
  );
  if (!headerMatches) {
    logger.warn('Resume upload rejected: content does not match PDF/DOCX signature', { userId });
    return fail('File content is not a valid PDF or DOCX document.', 415);
  }

  const parsedData = await parseResume(buffer);
  logger.info("Resume parsed successfully", { userId });
  return ok(parsedData);
});
