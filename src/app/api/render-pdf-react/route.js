import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import PdfResumeRenderer from "@/components/preview/PdfResumeRenderer";
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');

  await dbConnect();

  // Check permission
  const permResult = await requirePermission(userId, PERMISSIONS.DOWNLOAD_PDF);
  if (isPermissionError(permResult)) {
    return permResult.error;
  }

  try {
    const { resumeData, template } = await request.json();

    if (!resumeData || !template) {
      return new NextResponse("Missing resumeData or template", {
        status: 400,
      });
    }

    const TemplateComponent = (
      await import(`@/components/resume-templates/pdf-templates/${template}`)
    ).default;

    const doc = (
      <PdfResumeRenderer resumeData={resumeData} Template={TemplateComponent} />
    );
    const blob = await pdf(doc).toBlob();

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      'attachment; filename="resume-react.pdf"'
    );

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Error generating React PDF:", error);
    return new NextResponse("Error generating PDF", { status: 500 });
  }
}
