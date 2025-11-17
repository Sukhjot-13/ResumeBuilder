import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import PdfResumeRenderer from "@/components/preview/PdfResumeRenderer";

export async function POST(request) {
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
