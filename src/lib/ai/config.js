/**
 * AI Task Configuration — Single Source of Truth for model routing
 *
 * Every AI call in the app routes through this config. Change a model
 * for any task by editing one line here.
 *
 * Add new providers by implementing a runner in ./runners/ and adding
 * it to RUNNERS below.
 */

export const AI_TASKS = {
  RESUME_GENERATION: { provider: 'gemini', model: 'gemini-flash-latest' },
  AI_EDIT:           { provider: 'gemini', model: 'gemini-flash-latest' },
  RESUME_PARSING:    { provider: 'gemini', model: 'gemini-flash-latest' },
  GATEKEEPER:        { provider: 'gemini', model: 'gemini-flash-latest' },
};

/**
 * Override any task via environment variable.
 * Set e.g. AI_TASK_RESUME_GENERATION=anthropic:claude-sonnet-4-6
 * Format: "provider:model-name"
 */
export function getEffectiveConfig(taskKey) {
  const envKey = `AI_TASK_${taskKey}`;
  const envOverride = process.env[envKey];
  if (envOverride) {
    const [provider, ...modelParts] = envOverride.split(':');
    const model = modelParts.join(':');
    if (provider && model) {
      return { provider, model };
    }
  }
  return AI_TASKS[taskKey];
}
