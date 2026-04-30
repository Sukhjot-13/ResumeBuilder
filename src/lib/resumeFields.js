/**
 * resumeFields.js — SINGLE SOURCE OF TRUTH for resume content structure
 *
 * Every section and field in a resume's `content` object is defined here.
 * DO NOT duplicate field definitions anywhere else. Instead, use the
 * helper functions below to derive:
 *   - Mongoose sub-schemas  (generateMongooseFields)
 *   - AI prompt JSON string (generateAIPromptSchema)
 *   - Blank form state      (buildEmptyResume)
 *
 * To add, rename, or remove a field:
 *   1. Edit RESUME_FIELD_SCHEMA below — that's it.
 *   2. The Mongoose model, AI prompts, form, and display all update automatically.
 */

import mongoose from 'mongoose';

// ---------------------------------------------------------------------------
// Field type constants
// ---------------------------------------------------------------------------
export const FIELD_TYPES = {
  TEXT: 'text',
  EMAIL: 'email',
  URL: 'url',
  MONTH: 'month',       // <input type="month"> — "YYYY-MM"
  TEXTAREA: 'textarea',
  CHECKBOX: 'checkbox',
  BULLET_LIST: 'bullet-list',  // array of strings, one per line
  TAG_LIST: 'tag-list',        // array of strings entered as tags
};

// ---------------------------------------------------------------------------
// Master schema definition
// ---------------------------------------------------------------------------
/**
 * RESUME_FIELD_SCHEMA
 *
 * Shape:
 *  {
 *    [sectionKey]: {
 *      type: 'object' | 'array',
 *      label: string,          // human-readable section title
 *      fields: {
 *        [fieldKey]: {
 *          label:    string,
 *          type:     FIELD_TYPES.*,
 *          required: boolean,  // optional, defaults to false
 *          placeholder: string // optional
 *        }
 *      }
 *    }
 *  }
 */
export const RESUME_FIELD_SCHEMA = {
  profile: {
    type: 'object',
    label: 'Personal Info',
    fields: {
      full_name: {
        label: 'Full Name',
        type: FIELD_TYPES.TEXT,
        required: true,
        placeholder: 'Jane Doe',
      },
      email: {
        label: 'Email',
        type: FIELD_TYPES.EMAIL,
        required: true,
        placeholder: 'jane@example.com',
      },
      phone: {
        label: 'Phone',
        type: FIELD_TYPES.TEXT,
        placeholder: '+1 (555) 000-0000',
      },
      location: {
        label: 'Location',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Toronto, ON, Canada',
      },
      website: {
        label: 'Website / LinkedIn',
        type: FIELD_TYPES.URL,
        placeholder: 'https://linkedin.com/in/janedoe',
      },
      headline: {
        label: 'Headline',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Senior Software Engineer',
      },
      generic_summary: {
        label: 'Professional Summary',
        type: FIELD_TYPES.TEXTAREA,
        placeholder: 'Write a short paragraph about your background and strengths…',
      },
    },
  },

  work_experience: {
    type: 'array',
    label: 'Work Experience',
    fields: {
      job_title: {
        label: 'Job Title',
        type: FIELD_TYPES.TEXT,
        required: true,
        placeholder: 'Software Engineer',
      },
      company: {
        label: 'Company',
        type: FIELD_TYPES.TEXT,
        required: true,
        placeholder: 'Acme Corp',
      },
      start_date: {
        label: 'Start Date',
        type: FIELD_TYPES.MONTH,
        placeholder: 'YYYY-MM',
      },
      end_date: {
        label: 'End Date',
        type: FIELD_TYPES.MONTH,
        placeholder: 'YYYY-MM',
      },
      is_current: {
        label: 'I currently work here',
        type: FIELD_TYPES.CHECKBOX,
      },
      responsibilities: {
        label: 'Key Responsibilities / Achievements',
        type: FIELD_TYPES.BULLET_LIST,
        placeholder: 'Describe what you accomplished…',
      },
    },
  },

  education: {
    type: 'array',
    label: 'Education',
    fields: {
      institution: {
        label: 'Institution',
        type: FIELD_TYPES.TEXT,
        placeholder: 'University of Toronto',
      },
      degree: {
        label: 'Degree',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Bachelor of Science',
      },
      field_of_study: {
        label: 'Field of Study',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Computer Science',
      },
      start_date: {
        label: 'Start Date',
        type: FIELD_TYPES.MONTH,
      },
      end_date: {
        label: 'End Date',
        type: FIELD_TYPES.MONTH,
      },
      relevant_coursework: {
        label: 'Relevant Coursework',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Data Structures, Algorithms, Machine Learning',
      },
      bullets: {
        label: 'Highlights / Achievements',
        type: FIELD_TYPES.BULLET_LIST,
        placeholder: "Dean's List, GPA 3.9/4.0…",
      },
    },
  },

  skills: {
    type: 'array',
    label: 'Skills',
    fields: {
      skill_name: {
        label: 'Skill',
        type: FIELD_TYPES.TEXT,
        required: true,
        placeholder: 'React',
      },
      category: {
        label: 'Category',
        type: FIELD_TYPES.TEXT,
        placeholder: 'Frontend',
      },
    },
  },

  additional_info: {
    type: 'object',
    label: 'Additional Info',
    fields: {
      languages: {
        label: 'Languages',
        type: FIELD_TYPES.TAG_LIST,
        placeholder: 'e.g. English, French',
      },
      certifications: {
        label: 'Certifications',
        type: FIELD_TYPES.TAG_LIST,
        placeholder: 'e.g. AWS Certified Developer',
      },
      awards_activities: {
        label: 'Awards & Activities',
        type: FIELD_TYPES.TAG_LIST,
        placeholder: 'e.g. Hackathon Winner 2023',
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: build a blank resume content object
// ---------------------------------------------------------------------------
/**
 * Returns a blank resume content object whose shape exactly matches
 * RESUME_FIELD_SCHEMA. Use this to initialise form state.
 */
export function buildEmptyResume() {
  const content = {};
  for (const [sectionKey, section] of Object.entries(RESUME_FIELD_SCHEMA)) {
    if (section.type === 'object') {
      content[sectionKey] = {};
      for (const [fieldKey, field] of Object.entries(section.fields)) {
        if (field.type === FIELD_TYPES.TAG_LIST || field.type === FIELD_TYPES.BULLET_LIST) {
          content[sectionKey][fieldKey] = [];
        } else if (field.type === FIELD_TYPES.CHECKBOX) {
          content[sectionKey][fieldKey] = false;
        } else {
          content[sectionKey][fieldKey] = '';
        }
      }
    } else if (section.type === 'array') {
      content[sectionKey] = [];
    }
  }
  return content;
}

/**
 * Returns a blank item object for a single array-section entry.
 * e.g. buildEmptyArrayItem('work_experience') → { job_title: '', company: '', … }
 */
export function buildEmptyArrayItem(sectionKey) {
  const section = RESUME_FIELD_SCHEMA[sectionKey];
  if (!section || section.type !== 'array') return {};
  const item = {};
  for (const [fieldKey, field] of Object.entries(section.fields)) {
    if (field.type === FIELD_TYPES.BULLET_LIST || field.type === FIELD_TYPES.TAG_LIST) {
      item[fieldKey] = [];
    } else if (field.type === FIELD_TYPES.CHECKBOX) {
      item[fieldKey] = false;
    } else {
      item[fieldKey] = '';
    }
  }
  return item;
}

// ---------------------------------------------------------------------------
// Helper: generate Mongoose field definitions from the schema
// ---------------------------------------------------------------------------
/**
 * Maps our field types to the Mongoose type that should be used.
 */
function mongooseTypeForField(field) {
  switch (field.type) {
    case FIELD_TYPES.CHECKBOX:
      return Boolean;
    case FIELD_TYPES.BULLET_LIST:
    case FIELD_TYPES.TAG_LIST:
      return [String];
    default:
      return String;
  }
}

/**
 * Generates a plain mongoose.Schema.Types definition object for a section's fields.
 * Used internally by generateMongooseContentSchema().
 */
function buildMongooseSectionFields(sectionFields) {
  const def = {};
  for (const [fieldKey, field] of Object.entries(sectionFields)) {
    def[fieldKey] = mongooseTypeForField(field);
  }
  return def;
}

/**
 * Generates the full Mongoose schema definition for the `content` field of a Resume.
 * Returns an object you can pass directly to `new mongoose.Schema({ content: <this> })`.
 */
export function generateMongooseContentSchema() {
  const content = {};

  for (const [sectionKey, section] of Object.entries(RESUME_FIELD_SCHEMA)) {
    const fieldsObj = buildMongooseSectionFields(section.fields);

    if (section.type === 'object') {
      content[sectionKey] = new mongoose.Schema(fieldsObj, { _id: false });
    } else if (section.type === 'array') {
      content[sectionKey] = [new mongoose.Schema(fieldsObj)];
    }
  }

  return content;
}

// ---------------------------------------------------------------------------
// Helper: generate AI prompt schema JSON string
// ---------------------------------------------------------------------------
/**
 * Builds the example JSON string used in AI prompts — derived from the schema.
 * Replaces the hand-written RESUME_SCHEMA_FOR_PROMPT constant.
 */
export function generateAIPromptSchema() {
  const obj = {};

  for (const [sectionKey, section] of Object.entries(RESUME_FIELD_SCHEMA)) {
    if (section.type === 'object') {
      const fields = {};
      for (const [fieldKey, field] of Object.entries(section.fields)) {
        if (field.type === FIELD_TYPES.BULLET_LIST || field.type === FIELD_TYPES.TAG_LIST) {
          fields[fieldKey] = ['...'];
        } else if (field.type === FIELD_TYPES.CHECKBOX) {
          fields[fieldKey] = false;
        } else if (field.type === FIELD_TYPES.MONTH) {
          fields[fieldKey] = 'YYYY-MM';
        } else {
          fields[fieldKey] = '...';
        }
      }
      obj[sectionKey] = fields;
    } else if (section.type === 'array') {
      const item = {};
      for (const [fieldKey, field] of Object.entries(section.fields)) {
        if (field.type === FIELD_TYPES.BULLET_LIST || field.type === FIELD_TYPES.TAG_LIST) {
          item[fieldKey] = ['...', '...'];
        } else if (field.type === FIELD_TYPES.CHECKBOX) {
          item[fieldKey] = false;
        } else if (field.type === FIELD_TYPES.MONTH) {
          item[fieldKey] = 'YYYY-MM';
        } else {
          item[fieldKey] = '...';
        }
      }
      obj[sectionKey] = [item];
    }
  }

  return JSON.stringify(obj, null, 2);
}
