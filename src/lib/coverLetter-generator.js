/**
 * Cover Letter Generator — shared core for cover letter generation.
 */
import { callAI } from '@/lib/ai/client';
import { sanitizeJobDescription } from '@/lib/sanitize';
import { generateCoverLetterPromptSchema } from '@/lib/coverLetterFields';
import { FACTUAL_ACCURACY_RULES, JSON_OUTPUT_RULES } from '@/lib/ai/promptRules';

const MAX_NAME_LENGTH = 200;

const COVER_LETTER_OUTPUT_SCHEMA = generateCoverLetterPromptSchema();

const BASE_PROMPT = `
[TASK]
You are a professional cover letter writer. Write a compelling, tailored cover letter for the user based on their resume and the target job description.
Your output MUST be a valid JSON object with the fields below.

${FACTUAL_ACCURACY_RULES}
${JSON_OUTPUT_RULES}

[OUTPUT JSON SCHEMA]
{{SCHEMA}}

[INSTRUCTIONS]
1. Address the recipient by name if provided; otherwise use "Hiring Manager".
2. First paragraph: Open with a concrete, supported connection between the candidate's experience and the target role/company.
3. Middle paragraphs: Develop 1-2 verified achievements or examples and explain why they matter for the job's top requirements. Do not repeat resume bullets verbatim or invent missing results.
4. Final paragraph: Briefly express interest in an interview and the value the candidate can contribute based on their demonstrated experience.
5. Target 250-350 words across 3-4 body paragraphs. Use shorter, coherent paragraphs; do not add filler when source evidence is limited.
6. Use professional, natural language. Avoid clichés, generic superlatives, exaggerated expertise and claims of being a perfect fit.
7. Use only supplied company information; do not infer its mission, culture or products.
8. Copy jobTitle and companyName from the target job description; use "Unknown Company" if the company is not identified and an empty jobTitle if absent.
9. Preserve supplied sender contact information exactly. Prefer the explicit sender details; for missing details use the corresponding supplied resume profile value, otherwise an empty string.
10. Only set recipientTitle when a distinct title is supplied; otherwise use an empty string. Never repeat recipientName in recipientTitle.
`;

/**
 * Generate a cover letter from the user's resume and a job description.
 *
 * Defence in depth: every caller-supplied string is scrubbed of prompt
 * injection patterns and length-capped here as well as at the route boundary,
 * so no caller can reintroduce the override lane.
 *
 * @param {object} resume           - The user's current resume data
 * @param {string} jobDescription   - Sanitized job description text
 * @param {object} opts
 * @param {string} opts.recipientName - Optional hiring manager name
 * @param {string} opts.userName    - Optional sender name
 * @param {string} opts.userEmail   - Optional sender email
 * @param {string} opts.userPhone   - Optional sender phone
 * @returns {Promise<object>}       - Cover letter content object
 */
export async function generateCoverLetter(resume, jobDescription, opts = {}) {
  const { recipientName, userName, userEmail, userPhone } = opts;

  const cleanRecipientName = sanitizeJobDescription(recipientName).slice(0, MAX_NAME_LENGTH);
  const cleanUserName = sanitizeJobDescription(userName).slice(0, MAX_NAME_LENGTH);

  let prompt = BASE_PROMPT.replace('{{SCHEMA}}', COVER_LETTER_OUTPUT_SCHEMA);

  prompt += `\n\n[USER'S RESUME]\n${JSON.stringify(resume, null, 2)}`;
  prompt += `\n\n[JOB DESCRIPTION]\n${JSON.stringify(jobDescription)}`;

  if (cleanRecipientName) {
    prompt += `\n\n[RECIPIENT NAME]\n${JSON.stringify(cleanRecipientName)}`;
  }

  prompt += `\n\n[SPECIFIC INSTRUCTIONS]
- Sender name: ${JSON.stringify(cleanUserName || '')}
- Sender email: ${JSON.stringify(userEmail || '')}
- Sender phone: ${JSON.stringify(userPhone || '')}
- Format bodyParagraphs as an array of strings, one paragraph per element.
- Do not add a letter date field; it is not part of the output schema.
- Only use a supplied, distinct job title for recipientTitle; otherwise leave it as an empty string.`;

  return callAI('COVER_LETTER_GENERATION', prompt, { parseJson: true });
}
