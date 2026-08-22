/**
 * sanitize.js — Shared utility for sanitizing user-provided text (e.g. job descriptions)
 * against prompt injection patterns.
 */

const INJECTION_PATTERNS = [
  /\[.*?(ignore|disregard|forget|override|system|instruction|task|prompt|jailbreak).*?\]/gi,
  /<\s*(system|instruction|prompt|task|override)\s*>/gi,
  /###\s*(system|instruction|override|ignore)/gi,
  /you\s+are\s+now\s+/gi,
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instruction|prompt|rule)/gi,
  /forget\s+(everything|all)\s+/gi,
  // Only strip identity overrides ("act as the system / an AI assistant"),
  // NOT legitimate job text like "you will act as a mentor for junior staff"
  /act\s+as\s+(if\s+you\s+(are|were)\s+)?(a\s+|an\s+|the\s+)?(system|ai|artificial\s+intelligence|language\s+model|llm|chatbot|assistant|developer|admin(?:istrator)?)\b/gi,
];

export const MAX_JOB_DESCRIPTION_LENGTH = 8000;

/**
 * Sanitize a job description by removing prompt injection patterns and truncating.
 * @param {string} text The raw input text
 * @returns {string} Sanitized text (max 8000 chars)
 */
export function sanitizeJobDescription(text) {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }
  if (sanitized.length > MAX_JOB_DESCRIPTION_LENGTH) {
    // Don't fail silently — make the truncation observable in server logs
    console.warn(
      `[sanitize] Job description truncated from ${sanitized.length} to ${MAX_JOB_DESCRIPTION_LENGTH} chars`
    );
    sanitized = sanitized.slice(0, MAX_JOB_DESCRIPTION_LENGTH);
  }
  return sanitized;
}

/**
 * Like sanitizeJobDescription but reports what happened — for callers that want
 * to surface a notice to the user.
 * @returns {{ text: string, wasTruncated: boolean }}
 */
export function sanitizeJobDescriptionWithInfo(text) {
  if (!text || typeof text !== 'string') return { text: '', wasTruncated: false };
  const originalLength = text.length;
  const clean = sanitizeJobDescription(text);
  return { text: clean, wasTruncated: originalLength > MAX_JOB_DESCRIPTION_LENGTH };
}
