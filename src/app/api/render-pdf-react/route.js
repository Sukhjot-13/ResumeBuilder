import { NextResponse } from "next/server";
import { generatePdf, generateCoverLetterPdf } from '@/lib/pdf-generator';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import { readJson } from '@/lib/apiResponse';
import { logger } from '@/lib/logger';
import dbConnect from '@/lib/mongodb';

// PDF payloads can be large — allow up to 1MB (resume JSON + formatting)
const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(request) {
  const { userId, error } = await resolveUserId(request);
  if (error) return error;

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DOWNLOAD_PDF);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  const parsed = await readJson(request, MAX_BODY_BYTES);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body || {};

  try {
    const { type } = body;

    // Handle cover letter PDF
    if (type === 'cover-letter') {
      const { coverLetterData } = body;
      if (!coverLetterData) {
        return fail("Missing coverLetterData", 400);
      }
      const buffer = await generateCoverLetterPdf(coverLetterData);
      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", 'attachment; filename="cover-letter.pdf"');
      return new NextResponse(buffer, { headers });
    }

    // Handle resume PDF
    const { resumeData, template } = body;
    if (!resumeData || !template) {
      return fail("Missing resumeData or template", 400);
    }

    const buffer = await generatePdf(resumeData, template);

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'attachment; filename="resume-react.pdf"');

    return new NextResponse(buffer, { headers });
  } catch (error) {
    if (error && typeof error.message === 'string' && error.message.startsWith('Unknown template:')) {
      logger.warn('PDF generation rejected unknown template', { userId, template: body.template });
      return fail('Unknown template', 400);
    }
    logger.error('Error generating React PDF', error, { userId });
    return fail('Error generating PDF', 500);
  }
}
