import { callAI } from '@/lib/ai/client';
import { generateCoverLetterPromptSchema } from '@/lib/coverLetterFields';
import { EDIT_SCOPE_RULES, FACTUAL_ACCURACY_RULES, JSON_OUTPUT_RULES } from '@/lib/ai/promptRules';

const COVER_LETTER_SCHEMA_FOR_PROMPT = generateCoverLetterPromptSchema();

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

    ${FACTUAL_ACCURACY_RULES}
    ${EDIT_SCOPE_RULES}
    ${JSON_OUTPUT_RULES}

    [USER'S CURRENT COVER LETTER]
    ${JSON.stringify(coverLetterContent, null, 2)}

    [USER'S EDIT QUERY]
    ${JSON.stringify(query)}

    [INSTRUCTIONS]
    1. Identify the targeted fields or paragraphs and change only what the user requested.
    2. Preserve recipient, sender contact details, company and target role unless a specific change to them is requested. Add new factual claims only when explicitly supplied.
    3. Keep bodyParagraphs as an array of strings. Preserve paragraph order unless restructuring is requested; maintain coherent transitions and the original length unless a length change is requested.
    4. Keep language natural and specific; avoid clichés, exaggerated claims and invented company information.
    5. For ambiguous, unsupported or out-of-schema requests, return the original content unchanged.

    [OUTPUT JSON SCHEMA]
    ${COVER_LETTER_SCHEMA_FOR_PROMPT}
  `;

  return callAI('AI_EDIT', prompt, { parseJson: true });
}
