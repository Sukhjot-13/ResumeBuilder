/**
 * DeepSeek AI runner — OpenAI-compatible API.
 * Uses DEEPSEEK_API_KEY env var (accessed via @/config/env).
 */
import env from '@/config/env';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
// Hard caps so a hung/looping provider call can't pin a route forever
export const AI_TIMEOUT_MS = 60_000;
export const AI_MAX_TOKENS = 4096;

function getApiKey() {
  const key = env.deepseekApiKey;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  return key;
}

/**
 * Call DeepSeek with the given model name and prompt.
 * @param {string} modelName - e.g. 'deepseek-chat'
 * @param {string} prompt - The text prompt
 * @returns {Promise<string>} Raw response text
 */
export async function callDeepSeek(modelName, prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: AI_MAX_TOKENS,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DeepSeek API error (${res.status}): ${text}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parses a JSON response from DeepSeek, handling markdown code blocks.
 */
export function parseDeepSeekJson(text) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  } else if (lastBrace !== -1) {
    clean = clean.substring(0, lastBrace + 1);
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`DeepSeek parse error: ${clean.substring(0, 200)}...`);
  }
}
