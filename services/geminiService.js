// services/geminiService.js
import { GoogleGenAI, Type } from '@google/genai';
import config from '../config.js';

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const systemPrompt = `You are a high-quality music playlist assistant.
Your ONLY task is to generate a list of 10 songs based on the user's prompt (which will be a theme, vibe, or genre).
You must find 10 **distinct** and **highly relevant** songs that fit the theme.
Each element in the array MUST be a string in the format: "Song Name by Artist".`;

/**
 * Generate a playlist of track queries using Gemini AI based on user prompt.
 * @param {string} prompt Theme, vibe, or genre prompt
 * @returns {Promise<Array<string>>} Array of song strings ("Song Name by Artist")
 */
export async function generateDJPlaylist(prompt) {
  console.log(`Generating playlist for vibe: "${prompt}"...`);
  const randomSeed = Math.floor(Math.random() * 1000000);

  const response = await ai.models.generateContent({
    model: config.GEMINI_MODEL,
    contents: `Seed: ${randomSeed} | User Vibe: ${prompt}`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'List of song titles formatted as "Song Name by Artist"',
      },
      temperature: 0.9,
      topP: 0.95,
    },
  });

  const rawText = response.text;
  const playlist = JSON.parse(rawText);
  if (!Array.isArray(playlist)) {
    throw new Error('AI response is not a valid JSON array');
  }

  return playlist;
}
