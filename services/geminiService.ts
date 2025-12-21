
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Fetches insights for a track using Gemini API.
 * Uses process.env.API_KEY directly as per guidelines.
 */
export const getTrackInsights = async (title: string, artist: string) => {
  // Directly initialize with process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze the music track "${title}" by "${artist}". Provide a brief mood description, an interesting historical fact or trivia about the song or artist, and a "genre vibe" descriptor.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: {
              type: Type.STRING,
              description: "The mood or emotional quality of the track.",
            },
            factoid: {
              type: Type.STRING,
              description: "An interesting fact or trivia about the song or artist.",
            },
            genreVibe: {
              type: Type.STRING,
              description: "A descriptor for the genre and overall vibe.",
            },
          },
          required: ["mood", "factoid", "genreVibe"],
          propertyOrdering: ["mood", "factoid", "genreVibe"],
        },
      },
    });

    // response.text is a getter, use it directly.
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
