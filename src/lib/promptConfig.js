/**
 * promptConfig.js — SINGLE SOURCE OF TRUTH for AI prompt strategies
 *
 * Maps user roles to prompt templates for resume generation.
 *
 * HOW TO ADD A NEW TIER / CHANGE A PROMPT:
 *   1. Add or edit an entry in PROMPT_STRATEGIES to map a role to a template name.
 *   2. Add or edit the corresponding builder function in PROMPT_TEMPLATES.
 *   3. That's it — contentGenerationService picks it up automatically.
 *
 * NEVER hardcode prompt text in contentGenerationService.js or any API route.
 */

import { ROLES } from '@/lib/constants';
import { RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT } from '@/lib/resumeSchema';

// ---------------------------------------------------------------------------
// Role → template name mapping
// ---------------------------------------------------------------------------
export const PROMPT_STRATEGIES = {
  [ROLES.ADMIN]:      'premium',
  [ROLES.DEVELOPER]:  'premium',
  [ROLES.SUBSCRIBER]: 'standard',
  [ROLES.USER]:       'basic',
};

// ---------------------------------------------------------------------------
// Shared output schema instructions (same for all tiers)
// ---------------------------------------------------------------------------
const OUTPUT_SCHEMA_INSTRUCTION = `
  The output JSON schema must be exactly:
  ${RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT}
`;

// ---------------------------------------------------------------------------
// Prompt builder functions
// Each receives: { resume, jobDescription, specialInstructions }
// specialInstructions is already validated/empty for users without the permission
// ---------------------------------------------------------------------------

/**
 * BASIC prompt — free users.
 * Straightforward tailoring, no deep analysis.
 */
function buildBasicPrompt({ resume, jobDescription }) {
  return `
[TASK]
You are a professional resume writer. Tailor the user's resume for the job description below.
Your output MUST be a valid JSON object with keys "resume" and "metadata".

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${jobDescription}

[INSTRUCTIONS]
1. Rewrite "generic_summary" to a 2-3 sentence tailored summary relevant to the job.
2. For each work experience, rewrite "responsibilities" into 3-5 achievement-oriented bullet points aligned with the job.
3. Keep only the most relevant skills.
4. Extract "jobTitle" and "companyName" from the job description for the metadata.
5. If company name is not found, use "Unknown Company".
6. Output valid JSON only — no markdown, no explanation.

${OUTPUT_SCHEMA_INSTRUCTION}
  `.trim();
}

/**
 * STANDARD prompt — Pro subscribers.
 * Deeper keyword alignment and ATS optimization.
 */
function buildStandardPrompt({ resume, jobDescription, specialInstructions }) {
  let prompt = `
[TASK]
You are an expert ATS-optimized resume writer. Your task is to rewrite the user's resume to be highly tailored for a specific job description.
Your output MUST be a valid JSON object with keys "resume" and "metadata".

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${jobDescription}

[INSTRUCTIONS]
1. Rewrite "generic_summary" into a compelling 3-4 sentence tailored summary that mirrors keywords from the job description.
2. For each work experience, rewrite "responsibilities" into 3-5 quantified, achievement-oriented bullet points that align with the job description's requirements.
3. Select and prioritize the most relevant skills from the user's list; include any critical skills mentioned in the job description that the user plausibly has.
4. Use action verbs and ATS-friendly language throughout.
5. Extract "jobTitle" and "companyName" from the job description for the metadata.
6. If company name is not found, use "Unknown Company".
7. Output valid JSON only — no markdown, no explanation.
8. Pay close attention to any [SPECIAL INSTRUCTIONS] provided and follow them precisely.

${OUTPUT_SCHEMA_INSTRUCTION}
  `.trim();

  if (specialInstructions) {
    prompt += `\n\n[SPECIAL INSTRUCTIONS]\n${specialInstructions}`;
  }

  return prompt;
}

/**
 * PREMIUM prompt — Admin / Developer roles.
 * Deep analysis, strategic positioning, strongest output quality.
 */
function buildPremiumPrompt({ resume, jobDescription, specialInstructions }) {
  let prompt = `
[TASK]
You are a world-class executive resume strategist with deep expertise in ATS systems, hiring manager psychology, and keyword optimization.
Your task: produce the highest-quality, most compelling tailored resume possible for the given job.
Your output MUST be a valid JSON object with keys "resume" and "metadata".

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${jobDescription}

[INSTRUCTIONS]
1. Write a powerful, 4-5 sentence tailored summary that positions the candidate as the ideal hire, incorporating the job's most critical requirements.
2. For each work experience, craft 4-6 achievement-driven bullet points that use the STAR method (Situation, Task, Action, Result) where possible. Include quantifiable metrics.
3. Strategically surface the most impactful skills, adding relevant industry keywords from the job description that the candidate credibly has.
4. Ensure every section reflects the language, tone, and priorities of the target job.
5. Extract "jobTitle" and "companyName" from the job description for the metadata.
6. If company name is not found, use "Unknown Company".
7. Output valid JSON only — no markdown, no explanation.
8. Follow any [SPECIAL INSTRUCTIONS] with the highest precision — they override general guidance.

${OUTPUT_SCHEMA_INSTRUCTION}
  `.trim();

  if (specialInstructions) {
    prompt += `\n\n[SPECIAL INSTRUCTIONS]\n${specialInstructions}`;
  }

  return prompt;
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------
export const PROMPT_TEMPLATES = {
  basic:    buildBasicPrompt,
  standard: buildStandardPrompt,
  premium:  buildPremiumPrompt,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the prompt string for the given user role.
 *
 * @param {number} userRole - The user's role (from ROLES constant)
 * @param {{ resume: object, jobDescription: string, specialInstructions: string }} params
 * @returns {string} The fully built prompt string
 */
export function buildPromptForRole(userRole, params) {
  const strategyName = PROMPT_STRATEGIES[userRole] ?? 'basic';
  const builder = PROMPT_TEMPLATES[strategyName] ?? PROMPT_TEMPLATES.basic;
  return builder(params);
}
