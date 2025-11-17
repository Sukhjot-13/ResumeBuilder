import { GoogleGenerativeAI } from "@google/generative-ai";

let geminiAI = null;

export function getGeminiModel() {
  if (!geminiAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    geminiAI = new GoogleGenerativeAI(apiKey);
  }
  return geminiAI.getGenerativeModel({ model: "gemini-pro" });
}

export function getGeminiFlashModel() {
  if (!geminiAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    geminiAI = new GoogleGenerativeAI(apiKey);
  }
  return geminiAI.getGenerativeModel({ model: "gemini-flash-latest" });
}
