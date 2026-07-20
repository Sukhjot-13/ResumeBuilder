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
  /act\s+as\s+(if\s+you\s+are\s+)?(a\s+)?/gi,
];

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
  return sanitized.slice(0, 8000);
}
