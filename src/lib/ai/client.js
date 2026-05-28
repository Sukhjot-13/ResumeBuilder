/**
 * Unified AI Client — call any configured AI task with one function.
 *
 * Usage:
 *   import { callAI } from '@/lib/ai/client';
 *   const text = await callAI('RESUME_GENERATION', prompt);
 *   const json = await callAI('RESUME_GENERATION', prompt, { parseJson: true });
 */

import { getEffectiveConfig } from './config';
import { callGemini, parseGeminiJson } from './runners/gemini';
import { callDeepSeek, parseDeepSeekJson } from './runners/deepseek';

const RUNNERS = {
  gemini: {
    run: callGemini,
    parseJson: parseGeminiJson,
  },
  deepseek: {
    run: callDeepSeek,
    parseJson: parseDeepSeekJson,
  },
};

/**
 * Call the AI for a given task.
 *
 * @param {string} taskKey - One of AI_TASKS keys (e.g. 'RESUME_GENERATION')
 * @param {string} prompt  - The text prompt
 * @param {object} [opts]
 * @param {boolean} [opts.parseJson] - Return parsed JSON instead of raw text
 * @returns {Promise<string|object>}
 */
export async function callAI(taskKey, prompt, opts = {}) {
  const { provider, model } = getEffectiveConfig(taskKey);
  const runner = RUNNERS[provider];

  if (!runner) {
    throw new Error(`Unknown AI provider: ${provider} (task: ${taskKey})`);
  }

  const text = await runner.run(model, prompt);

  if (opts.parseJson) {
    if (runner.parseJson) {
      return runner.parseJson(text);
    }
    // Fallback: generic JSON parse
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`AI response was not valid JSON for task ${taskKey}`);
    }
  }

  return text;
}
