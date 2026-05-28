import { NextResponse } from "next/server";
import { generatePdf, generateCoverLetterPdf } from '@/lib/pdf-generator';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');

  await dbConnect();

  const permResult = await requirePermission(userId, PERMISSIONS.DOWNLOAD_PDF);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    const body = await request.json();
    const { type } = body;

    // Handle cover letter PDF
    if (type === 'cover-letter') {
      const { coverLetterData } = body;
      if (!coverLetterData) {
        return new NextResponse("Missing coverLetterData", { status: 400 });
      }
      const buffer = await generateCoverLetterPdf(coverLetterData);
      const headers = new Headers();
      headers.set("Content-Type", "application/pdf");
      headers.set("Content-Disposition", 'attachment; filename="cover-letter.pdf"');
      return new NextResponse(buffer, { headers });
    }

    // Handle resume PDF (existing behavior)
    const { resumeData, template } = body;
    if (!resumeData || !template) {
      return new NextResponse("Missing resumeData or template", { status: 400 });
    }

    const buffer = await generatePdf(resumeData, template);

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", 'attachment; filename="resume-react.pdf"');

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error("Error generating React PDF:", error);
    return new NextResponse("Error generating PDF", { status: 500 });
  }
}
