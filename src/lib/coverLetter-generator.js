/**
 * Cover Letter Generator — shared core for cover letter generation.
 */
import { callAI } from '@/lib/ai/client';

const COVER_LETTER_OUTPUT_SCHEMA = `{
  "recipientName": "string (the hiring manager name or 'Hiring Manager')",
  "recipientTitle": "string (optional, their title)",
  "companyName": "string",
  "jobTitle": "string",
  "salutation": "string (e.g. 'Dear Hiring Manager,')",
  "bodyParagraphs": "array of strings (3-4 paragraphs)",
  "closing": "string (e.g. 'Sincerely,')",
  "senderName": "string (the user's full name)",
  "senderEmail": "string (the user's email)"
}`;

const BASE_PROMPT = `
[TASK]
You are a professional cover letter writer. Write a compelling, tailored cover letter for the user based on their resume and the target job description.
Your output MUST be a valid JSON object with the fields below.

[OUTPUT SCHEMA]
{{SCHEMA}}

[INSTRUCTIONS]
1. Address the recipient by name if provided; otherwise use "Hiring Manager".
2. First paragraph: Hook — express enthusiasm and mention the role/company.
3. Middle paragraphs: Connect 2-3 key achievements from the resume to the job requirements. Be specific, not generic.
4. Final paragraph: Call to action — express interest in an interview.
5. Keep each paragraph to 3-5 sentences.
6. Use professional but natural language — not overly formal or robotic.
7. Output valid JSON only — no markdown, no explanation, no code fences.
`;

/**
 * Generate a cover letter from the user's resume and a job description.
 *
 * @param {object} resume           - The user's current resume data
 * @param {string} jobDescription   - Sanitized job description text
 * @param {object} opts
 * @param {string} opts.recipientName - Optional hiring manager name
 * @param {string} opts.userName    - Optional sender name
 * @param {string} opts.userEmail   - Optional sender email
 * @returns {Promise<object>}       - Cover letter content object
 */
export async function generateCoverLetter(resume, jobDescription, opts = {}) {
  const { recipientName, userName, userEmail } = opts;

  let prompt = BASE_PROMPT.replace('{{SCHEMA}}', COVER_LETTER_OUTPUT_SCHEMA);

  prompt += `\n\n[USER'S RESUME]\n${JSON.stringify(resume, null, 2)}`;
  prompt += `\n\n[JOB DESCRIPTION]\n${jobDescription}`;

  if (recipientName) {
    prompt += `\n\n[RECIPIENT NAME]\n${recipientName}`;
  }

  prompt += `\n\n[SPECIFIC INSTRUCTIONS]
- Sender name: ${userName || 'the user'}
- Sender email: ${userEmail || ''}
- Use today's date as the letter date.
- Format bodyParagraphs as an array of strings, one paragraph per element.`;

  return callAI('COVER_LETTER_GENERATION', prompt, { parseJson: true });
}
