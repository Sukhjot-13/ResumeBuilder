/**
 * DeepSeek AI runner — OpenAI-compatible API.
 * Uses DEEPSEEK_API_KEY env var.
 */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

function getApiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
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
  const res = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Parses a JSON response from DeepSeek, handling markdown code blocks.
 */
export function parseDeepSeekJson(text) {
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  const lastBrace = clean.lastIndexOf('}');
  if (lastBrace !== -1) clean = clean.substring(0, lastBrace + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`DeepSeek parse error: ${clean.substring(0, 200)}...`);
  }
}
