import { generateResume } from '@/lib/resume-generator';

/**
 * Generates tailored resume content based on a user's resume, a job description,
 * optional special instructions, and the user's role.
 *
 * Delegates to the shared resume-generator library which handles
 * AI model routing via the AI config system.
 *
 * @param {object} resume - The user's resume data.
 * @param {string} jobDescription - The sanitized job description.
 * @param {string} specialInstructions - Special instructions (empty string for free users).
 * @param {number} userRole - The user's role (from ROLES constant).
 * @returns {Promise<object>} The tailored resume data and metadata.
 */
export async function generateTailoredContent(resume, jobDescription, specialInstructions = '', userRole) {
  return generateResume(resume, jobDescription, specialInstructions, userRole);
}
