import { GoogleGenerativeAI } from "@google/generative-ai";

let geminiAI = null;

export function getGeminiClient() {
  if (!geminiAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    geminiAI = new GoogleGenerativeAI(apiKey);
  }
  return geminiAI;
}

export function getGeminiModel() {
  return getGeminiClient().getGenerativeModel({ model: "gemini-pro" });
}

export function getGeminiFlashModel() {
  return getGeminiClient().getGenerativeModel({ model: "gemini-flash-latest" });
}

/**
 * Parses a JSON response from Gemini, handling markdown code blocks.
 * This is the SINGLE place for parsing Gemini JSON responses.
 * 
 * @param {string} responseText - Raw text from Gemini response
 * @returns {object} Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
export function parseGeminiJsonResponse(responseText) {
  // Remove markdown code block markers
  let text = responseText.replace(/```json/g, "").replace(/```/g, "");
  
  // Find the last closing brace to handle any trailing content
  const lastBraceIndex = text.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    text = text.substring(0, lastBraceIndex + 1);
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Error parsing Gemini JSON response:', e);
    throw new Error(`AI parsing error: ${text.substring(0, 200)}...`);
  }
}
