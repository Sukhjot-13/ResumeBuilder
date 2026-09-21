import { GoogleGenerativeAI } from "@google/generative-ai";
import env from '@/config/env';
import { withTimeout } from '../withTimeout';

let client = null;

// Hard caps so a hung/looping provider call can't pin a route forever
export const AI_TIMEOUT_MS = 60_000;
export const AI_MAX_TOKENS = 4096;

function getClient() {
  if (!client) {
    const apiKey = env.geminiApiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

/**
 * Call Gemini with the given model name and prompt.
 * @param {string} modelName - e.g. 'gemini-flash-latest'
 * @param {string} prompt - The text prompt
 * @returns {Promise<string>} Raw response text
 */
export async function callGemini(modelName, prompt) {
  const model = getClient().getGenerativeModel({
    model: modelName,
    generationConfig: { maxOutputTokens: AI_MAX_TOKENS },
  });
  const result = await withTimeout(
    model.generateContent(prompt),
    AI_TIMEOUT_MS,
    'Gemini'
  );
  return result.response.text();
}

/**
 * Parses a JSON response from Gemini, handling markdown code blocks.
 */
export function parseGeminiJson(text) {
  let clean = text.replace(/```json/g, "").replace(/```/g, "");
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
    throw new Error(`AI parse error: ${clean.substring(0, 200)}...`);
  }
}
