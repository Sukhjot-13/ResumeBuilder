/**
 * AI Task Configuration — Single Source of Truth for model routing
 *
 * Every AI call in the app routes through this config. Change a model
 * for any task by editing one line here.
 * DeepSeek V4.1 Flash uses the API model name 'deepseek-flash'.
 *
 * Add new providers by implementing a runner in ./runners/ and adding
 * it to RUNNERS below.
 */

export const AI_TASKS = {
  RESUME_GENERATION:      { provider: 'deepseek', model: 'deepseek-flash' },
  COVER_LETTER_GENERATION: { provider: 'deepseek', model: 'deepseek-flash' },
  AI_EDIT:                { provider: 'deepseek', model: 'deepseek-flash' },
  RESUME_PARSING:         { provider: 'deepseek', model: 'deepseek-flash' },
  GATEKEEPER:             { provider: 'deepseek', model: 'deepseek-flash' },
};

/**
 * Override any task via environment variable.
 * Set e.g. AI_TASK_RESUME_GENERATION=deepseek:deepseek-flash
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
