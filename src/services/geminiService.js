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
