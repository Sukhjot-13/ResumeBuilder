/**
 * Resume Schema for AI Prompts
 *
 * This file is the source of the JSON schema strings used inside AI prompts.
 * The actual field definitions live in src/lib/resumeFields.js (single source of truth).
 *
 * If the resume structure changes, update ONLY resumeFields.js —
 * this file auto-derives the prompt strings from it.
 */

import { generateAIPromptSchema } from '@/lib/resumeFields';

/**
 * JSON schema string for the resume `content` object.
 * Used in AI prompt templates to instruct the model on the expected output format.
 */
export const RESUME_SCHEMA_FOR_PROMPT = generateAIPromptSchema();

/**
 * Resume schema with metadata wrapper (for content generation responses).
 */
export const RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT = JSON.stringify(
  {
    resume: JSON.parse(RESUME_SCHEMA_FOR_PROMPT),
    metadata: {
      jobTitle: '...',
      companyName: '...',
    },
  },
  null,
  2
);
