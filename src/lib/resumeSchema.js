/**
 * Resume Schema for AI Prompts
 * 
 * This is the SINGLE SOURCE OF TRUTH for the resume JSON schema used in AI prompts.
 * Both aiResumeEditorService.js and contentGenerationService.js should import this.
 * 
 * If the resume structure changes, update ONLY this file (and the Mongoose model).
 */

export const RESUME_SCHEMA_FOR_PROMPT = `{
  "profile": {
    "full_name": "...",
    "email": "...",
    "phone": "...",
    "location": "...",
    "website": "...",
    "headline": "...",
    "generic_summary": "..."
  },
  "work_experience": [
    {
      "job_title": "...",
      "company": "...",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "is_current": false,
      "responsibilities": ["...", "..."]
    }
  ],
  "education": [
    {
      "institution": "...",
      "degree": "...",
      "field_of_study": "...",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "relevant_coursework": "...",
      "bullets": ["...", "..."]
    }
  ],
  "skills": [
    { "skill_name": "...", "category": "..." }
  ],
  "additional_info": {
    "languages": [],
    "certifications": [],
    "awards_activities": []
  }
}`;

/**
 * Resume schema with metadata wrapper (for content generation responses)
 */
export const RESUME_WITH_METADATA_SCHEMA_FOR_PROMPT = `{
  "resume": ${RESUME_SCHEMA_FOR_PROMPT},
  "metadata": {
    "jobTitle": "...",
    "companyName": "..."
  }
}`;
