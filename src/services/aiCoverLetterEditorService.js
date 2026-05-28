import { callAI } from '@/lib/ai/client';
import { COVER_LETTER_FIELDS } from '@/lib/coverLetterFields';

const COVER_LETTER_SCHEMA_FOR_PROMPT = JSON.stringify(COVER_LETTER_FIELDS, null, 2);

/**
 * Edits a cover letter based on a natural language query.
 * @param {object} coverLetterContent - The cover letter content to edit.
 * @param {string} query - The user's edit request.
 * @returns {Promise<object>} The updated cover letter content.
 */
export async function editCoverLetterWithAI(coverLetterContent, query) {
  const prompt = `
    [TASK]
    You are an expert cover letter editor. Edit the user's cover letter based on their natural language query.
    Your output MUST be a valid JSON object with the cover letter schema below.

    [USER'S CURRENT COVER LETTER]
    ${JSON.stringify(coverLetterContent, null, 2)}

    [USER'S EDIT QUERY]
    "${query}"

    [INSTRUCTIONS]
    1. Carefully analyze the query to understand the requested changes.
    2. Modify the cover letter to reflect the changes while keeping the same structure.
    3. Ensure bodyParagraphs remains an array of strings.
    4. Output valid JSON only — no markdown, no explanation.

    [OUTPUT SCHEMA]
    ${COVER_LETTER_SCHEMA_FOR_PROMPT}
  `;

  return callAI('AI_EDIT', prompt, { parseJson: true });
}
