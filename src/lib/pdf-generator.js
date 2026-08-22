/**
 * PDF Generator — shared core for PDF generation.
 * Used by:
 *   - Old UI:  /api/render-pdf-react
 *   - Worker:  /api/resume/download/[id]
 */

import { pdf } from '@react-pdf/renderer';

// Allowlist of template ids that may be dynamically imported (M5 fix —
// never interpolate client-controlled values into import() unchecked)
export const ALLOWED_TEMPLATES = [
  'ClassicTemplate',
  'ClassicTemplate2',
  'Creative',
  'Modern',
  'Professional',
  'Simple',
];

/**
 * Generate a PDF blob from resume data using a named template.
 *
 * @param {object} resumeData  - The resume content object
 * @param {string} template    - Template component file name (without .js)
 * @returns {Promise<Buffer>}  - PDF as Buffer
 */
export async function generatePdf(resumeData, template) {
  // Accept both "ClassicTemplate" and "ClassicTemplate.js" forms
  const templateId = String(template || '').replace(/\.js$/, '');
  if (!ALLOWED_TEMPLATES.includes(templateId)) {
    throw new Error(`Unknown template: ${template}`);
  }

  const TemplateComponent = (await import(
    `@/components/resume-templates/pdf-templates/${template}`
  )).default;

  const PdfResumeRenderer = (await import(
    '@/components/preview/PdfResumeRenderer'
  )).default;

  const doc = <PdfResumeRenderer resumeData={resumeData} Template={TemplateComponent} />;
  const blob = await pdf(doc).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

/**
 * Generate a PDF blob from cover letter data.
 *
 * @param {object} coverLetterData - The cover letter content object
 * @returns {Promise<Buffer>}      - PDF as Buffer
 */
export async function generateCoverLetterPdf(coverLetterData) {
  const CoverLetterTemplate = (await import(
    '@/components/cover-letter/CoverLetterTemplate'
  )).default;

  const doc = <CoverLetterTemplate coverLetterData={coverLetterData} />;
  const blob = await pdf(doc).toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
