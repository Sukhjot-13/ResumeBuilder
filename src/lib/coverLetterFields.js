/**
 * coverLetterFields.js — Source of truth for cover letter content structure
 *
 * The cover letter content object shape:
 * {
 *   recipientName,       // Hiring manager name or "Hiring Manager"
 *   recipientTitle,      // Optional: their title
 *   companyName,         // Company being applied to
 *   jobTitle,            // Job title being applied for
 *   salutation,          // e.g. "Dear [recipientName],"
 *   bodyParagraphs,      // Array of paragraph strings (the main content)
 *   closing,             // e.g. "Sincerely,"
 *   senderName,          // User's full name (auto-filled from profile)
 *   senderEmail,         // User's email (auto-filled)
 * }
 */

export const COVER_LETTER_FIELDS = {
  recipientName: { type: 'text', label: 'Recipient Name', required: true },
  recipientTitle: { type: 'text', label: 'Recipient Title', required: false },
  companyName: { type: 'text', label: 'Company Name', required: true },
  jobTitle: { type: 'text', label: 'Job Title', required: true },
  salutation: { type: 'text', label: 'Salutation', required: false },
  bodyParagraphs: { type: 'array', label: 'Body Paragraphs', required: true },
  closing: { type: 'text', label: 'Closing', required: false },
  senderName: { type: 'text', label: 'Sender Name', required: false },
  senderEmail: { type: 'text', label: 'Sender Email', required: false },
};

/**
 * Build an empty cover letter content object for initial form state or AI output.
 */
export function buildEmptyCoverLetter() {
  return {
    recipientName: '',
    recipientTitle: '',
    companyName: '',
    jobTitle: '',
    salutation: '',
    bodyParagraphs: [''],
    closing: '',
    senderName: '',
    senderEmail: '',
  };
}
