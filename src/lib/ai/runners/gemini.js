import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
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
  const model = getClient().getGenerativeModel({ model: modelName });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Parses a JSON response from Gemini, handling markdown code blocks.
 */
export function parseGeminiJson(text) {
  let clean = text.replace(/```json/g, "").replace(/```/g, "");
  const lastBrace = clean.lastIndexOf('}');
  if (lastBrace !== -1) clean = clean.substring(0, lastBrace + 1);
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error(`AI parse error: ${clean.substring(0, 200)}...`);
  }
}
