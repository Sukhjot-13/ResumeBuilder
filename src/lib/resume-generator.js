/**
 * Resume Generator — shared core for resume generation.
 * Used by:
 *   - Old UI:  /api/generate-content  (via contentGenerationService)
 *   - Worker:  /api/resume/generate
 */

import { callAI } from '@/lib/ai/client';
import { buildPromptForRole } from '@/lib/promptConfig';

/**
 * Generate a tailored resume for a job description.
 *
 * @param {object} resume           - The user's current resume data
 * @param {string} jobDescription   - Sanitized job description text
 * @param {string} specialInstructions - Instructions (empty for free users)
 * @param {number} userRole         - Role constant (determines prompt tier)
 * @returns {Promise<object>}       - { resume: {…}, metadata: { jobTitle, companyName } }
 */
export async function generateResume(resume, jobDescription, specialInstructions = '', userRole) {
  const prompt = buildPromptForRole(userRole, { resume, jobDescription, specialInstructions });
  return callAI('RESUME_GENERATION', prompt, { parseJson: true });
}
