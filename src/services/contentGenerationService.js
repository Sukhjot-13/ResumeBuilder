import { getGeminiFlashModel, parseGeminiJsonResponse } from './geminiService';
import { buildPromptForRole } from '@/lib/promptConfig';

/**
 * Generates tailored resume content based on a user's resume, a job description,
 * optional special instructions, and the user's role.
 *
 * The prompt strategy is determined entirely by promptConfig.js.
 * To change prompts per tier, edit ONLY src/lib/promptConfig.js.
 *
 * @param {object} resume - The user's resume data.
 * @param {string} jobDescription - The sanitized job description.
 * @param {string} specialInstructions - Special instructions (empty string for free users).
 * @param {number} userRole - The user's role (from ROLES constant).
 * @returns {Promise<object>} The tailored resume data and metadata.
 */
export async function generateTailoredContent(resume, jobDescription, specialInstructions = '', userRole) {
  const prompt = buildPromptForRole(userRole, { resume, jobDescription, specialInstructions });

  const model = getGeminiFlashModel();
  const result = await model.generateContent(prompt);

  return parseGeminiJsonResponse(result.response.text());
}