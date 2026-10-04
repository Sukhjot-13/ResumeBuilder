/**
 * promptConfig.js — SINGLE SOURCE OF TRUTH for AI prompt strategies
 *
 * Maps user roles to prompt templates for resume generation.
 *
 * HOW TO ADD A NEW TIER / CHANGE A PROMPT:
 *   1. Add or edit an entry in PROMPT_STRATEGIES to map a role to a template name.
 *   2. Add or edit the corresponding builder function in PROMPT_TEMPLATES.
 *   3. That's it — the AI config system picks it up automatically.
 *
 * NEVER hardcode prompt text in API routes.
 */

import { ROLES } from '@/lib/constants';
import { RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT } from '@/lib/resumeSchema';
import { FACTUAL_ACCURACY_RULES, JSON_OUTPUT_RULES } from '@/lib/ai/promptRules';

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
${JSON_OUTPUT_RULES}

[OUTPUT JSON SCHEMA]
${RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT}
`;

const RESUME_TAILORING_RULES = `
[RESUME TAILORING RULES]
- Match the job's most important requirements to evidence in the supplied resume before selecting content. Use supported job-description keywords naturally; do not stuff keywords or add missing qualifications.
- Preserve official job titles, employers, education, contact details, dates, current-status flags and all employment/education records. Keep those records in their supplied order.
- Tailor the summary and responsibility wording and select/reorder relevant existing skills. A skill may be surfaced from explicit experience even if absent from the skills list, but it must be supported by the source.
- Keep the summary to 2-3 concise sentences about demonstrated strengths relevant to the role. Do not claim the candidate is the ideal hire or meets requirements unsupported by the source.
- Use at most 5 distinct bullets for a relevant role and fewer for older or less relevant roles. Use fewer when the source lacks sufficient facts; never invent filler to meet a bullet count.
- Build concise bullets from a clear action, supported context/tools and a result only when supplied. Preserve the original meaning and metrics; avoid repetition across bullets and the summary.
- Use present tense for ongoing responsibilities and past tense for completed work, including completed achievements in a current role.
`.trim();

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

${FACTUAL_ACCURACY_RULES}
${RESUME_TAILORING_RULES}

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${JSON.stringify(jobDescription)}

[INSTRUCTIONS]
1. Rewrite "generic_summary" using the strongest relevant facts already in the resume.
2. Rewrite "responsibilities" into concise, supported action/achievement bullets aligned with the job.
3. Select the most relevant supported skills, prioritizing the job's requirements.
4. Use clear, plain-text language and specific action verbs suitable for a resume.
5. Extract "jobTitle" and "companyName" from the job description for the metadata.
6. If company name is not found, use "Unknown Company".
7. Output valid JSON only — no markdown, no explanation.

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

${FACTUAL_ACCURACY_RULES}
${RESUME_TAILORING_RULES}

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${JSON.stringify(jobDescription)}

[INSTRUCTIONS]
1. Rewrite "generic_summary" around demonstrated strengths that address the job's highest-priority requirements.
2. Rewrite "responsibilities" into supported achievement bullets, using supplied metrics where available and truthful action/scope otherwise.
3. Prioritize supported skills and connect them to relevant experience; make transferable experience clear without implying an unheld qualification.
4. Use action verbs and ATS-friendly language throughout.
5. Extract "jobTitle" and "companyName" from the job description for the metadata.
6. If company name is not found, use "Unknown Company".
7. Output valid JSON only — no markdown, no explanation.
8. Follow [SPECIAL INSTRUCTIONS] for requested tone, emphasis or length while respecting the factual-accuracy and output-schema rules above.
  `.trim();

  if (specialInstructions) {
    prompt += `\n\n[SPECIAL INSTRUCTIONS]\n${JSON.stringify(specialInstructions)}`;
  }

  return `${prompt}\n\n${OUTPUT_SCHEMA_INSTRUCTION}`;
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

${FACTUAL_ACCURACY_RULES}
${RESUME_TAILORING_RULES}

[USER'S RESUME]
${JSON.stringify(resume, null, 2)}

[JOB DESCRIPTION]
${JSON.stringify(jobDescription)}

[INSTRUCTIONS]
1. Write a concise, persuasive summary positioning the candidate through their strongest documented evidence for the target role.
2. Use STAR-style action/context/result wording where the supplied facts support it. Do not invent missing context, outcomes or metrics.
3. Strategically surface the most impactful supported skills and use relevant industry keywords only when grounded in the candidate's experience.
4. Prioritize evidence addressing the job's critical requirements while preserving the candidate's actual seniority, history and qualifications.
5. Extract "jobTitle" and "companyName" from the job description for the metadata.
6. If company name is not found, use "Unknown Company".
7. Output valid JSON only — no markdown, no explanation.
8. Follow [SPECIAL INSTRUCTIONS] for requested tone, emphasis or length while respecting the factual-accuracy and output-schema rules above.
  `.trim();

  if (specialInstructions) {
    prompt += `\n\n[SPECIAL INSTRUCTIONS]\n${JSON.stringify(specialInstructions)}`;
  }

  return `${prompt}\n\n${OUTPUT_SCHEMA_INSTRUCTION}`;
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
