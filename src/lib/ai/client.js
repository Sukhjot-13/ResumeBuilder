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

// Retry policy for transient provider failures (network blips, 429/5xx).
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = [429, 500, 502, 503, 504];

function isRetryable(error) {
  const msg = error?.message || '';
  if (msg.startsWith('DeepSeek API error (')) {
    const status = parseInt(msg.match(/\((\d+)\)/)?.[1] || '0', 10);
    return RETRYABLE_STATUS.includes(status);
  }
  // Timeouts and network errors are worth one more shot; JSON parse errors are not
  return /timed out|fetch failed|network|ECONN|aborted/i.test(msg) && !msg.includes('parse');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runWithRetry(runner, model, prompt, taskKey) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runner.run(model, prompt);
    } catch (error) {
      lastError = error;
      const isLast = attempt === MAX_ATTEMPTS;
      if (isLast || !isRetryable(error)) break;
      await sleep(500 * Math.pow(2, attempt - 1)); // 500ms, 1s
    }
  }
  throw lastError;
}

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

  const text = await runWithRetry(runner, model, prompt, taskKey);

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
