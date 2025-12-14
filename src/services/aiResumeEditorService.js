import { getGeminiFlashModel, parseGeminiJsonResponse } from './geminiService';
import { RESUME_SCHEMA_FOR_PROMPT } from '@/lib/resumeSchema';

/**
 * Edits a user's resume based on a natural language query.
 * @param {object} resume - The user's current resume data.
 * @param {string} query - The user's edit request.
 * @returns {Promise<object>} The updated resume data.
 */
export async function editResumeWithAI(resume, query) {
  // Construct the prompt for the Gemini API
  let prompt = `
    [TASK]
    You are an expert resume editor. Your task is to edit the user's resume based on their natural language query.
    You will receive the user's current resume data and their edit query.
    Your output MUST be a JSON object with the same schema as the user's resume data.
    Analyze the user's query and determine if the requested changes are valid and can be accommodated within the existing resume schema.
    If the changes are valid, apply them and return the updated resume data.
    If the changes are not valid (e.g., the user asks to add a field that doesn't exist in the schema), you should return an error message. For now, just return the original resume data if the query is invalid.

    [USER'S CURRENT RESUME DATA]
    ${JSON.stringify(resume, null, 2)}

    [USER'S EDIT QUERY]
    "${query}"

    [INSTRUCTIONS]
    1. Carefully analyze the [USER'S EDIT QUERY] to understand the requested changes.
    2. Modify the [USER'S CURRENT RESUME DATA] to reflect the requested changes.
    3. Ensure the output is a valid JSON object with the same schema as the user's resume data.
    4. If the query is ambiguous or cannot be fulfilled within the given schema, it is acceptable to return the original resume data without modification.
    5. The output JSON schema should be as follows:
    ${RESUME_SCHEMA_FOR_PROMPT}
  `;

  // Call the Gemini API to generate the edited content
  const model = getGeminiFlashModel();
  const result = await model.generateContent(prompt);
  
  // Parse and return the JSON response using shared helper
  return parseGeminiJsonResponse(result.response.text());
}
