import { callAI } from '@/lib/ai/client';
import { RESUME_SCHEMA_FOR_PROMPT } from '@/lib/resumeSchema';
import { EDIT_SCOPE_RULES, FACTUAL_ACCURACY_RULES, JSON_OUTPUT_RULES } from '@/lib/ai/promptRules';

/**
 * Edits a user's resume based on a natural language query.
 * @param {object} resume - The user's current resume data.
 * @param {string} query - The user's edit request.
 * @returns {Promise<object>} The updated resume data.
 */
export async function editResumeWithAI(resume, query) {
  const prompt = `
    [TASK]
    You are an expert resume editor. Your task is to edit the user's resume based on their natural language query.
    You will receive the user's current resume data and their edit query.
    Your output MUST be the complete resume content JSON object in the schema below, without a resume/metadata wrapper.

    ${FACTUAL_ACCURACY_RULES}
    ${EDIT_SCOPE_RULES}
    ${JSON_OUTPUT_RULES}

    [USER'S CURRENT RESUME DATA]
    ${JSON.stringify(resume, null, 2)}

    [USER'S EDIT QUERY]
    ${JSON.stringify(query)}

    [INSTRUCTIONS]
    1. Identify the exact fields and existing list items targeted by the edit query; leave every unrelated value unchanged.
    2. Preserve official titles, employment/education history, contacts and dates unless the user explicitly supplies a replacement fact.
    3. Use metrics only when supplied. Improve action/scope wording without inventing numbers, skills or achievements.
    4. Keep bullets concise and use present/past tense appropriate to the underlying responsibility or achievement.
    5. For ambiguous, unsupported or out-of-schema requests, return the original content unchanged.

    [OUTPUT JSON SCHEMA]
    ${RESUME_SCHEMA_FOR_PROMPT}
  `;

  return callAI('AI_EDIT', prompt, { parseJson: true });
}
