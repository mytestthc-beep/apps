import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates, Place } from "../types";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

const sanitizeString = (value: any, fallback: string): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

export const findHiddenPlaces = async (coords: Coordinates): Promise<Place[]> => {
  if (!apiKey) throw new Error("API Key not found");

  const modelId = "gemini-2.5-flash";
  const prompt = `I am currently at latitude ${coords.latitude}, longitude ${coords.longitude}.
  
  Identify 4 "hidden gems" or lesser-known, interesting places within a 5km radius. 
  Focus on:
  - Quiet nature spots (parks, viewpoints, paths)
  - Cozy, non-touristy cafes or small eateries
  - Unique local architecture or historical markers
  - Places that offer a moment of peace or wonder
  
  Avoid major tourist attractions or crowded malls.
  
  Return the response in strictly valid JSON format matching the schema provided.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Name of the place",
              },
              description: {
                type: Type.STRING,
                description: "A short, evocative description (max 15 words)",
              },
              type: {
                type: Type.STRING,
                description: "Category (e.g., Nature, Cafe, Art)",
              },
              reason: {
                type: Type.STRING,
                description: "Why is this a hidden gem?",
              },
              estimatedDistance: {
                type: Type.STRING,
                description: "Estimated walking distance or time (e.g. '10 min walk')",
              },
            },
            required: ["name", "description", "type", "reason", "estimatedDistance"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    let rawPlaces;
    try {
      rawPlaces = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      return [];
    }

    if (!Array.isArray(rawPlaces)) {
      return [];
    }
    
    // Sanitize data to ensure no objects are passed to the UI components
    return rawPlaces.map((p: any) => ({
      name: sanitizeString(p.name, "Unknown Place"),
      description: sanitizeString(p.description, "A hidden gem nearby."),
      type: sanitizeString(p.type, "Spot"),
      reason: sanitizeString(p.reason, "Worth checking out."),
      estimatedDistance: sanitizeString(p.estimatedDistance, "Nearby")
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    // Ensure we throw a simple Error object with a string message
    throw new Error("Failed to discover places. The spirits are quiet today.");
  }
};