import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates, Place } from "../types";

// Server-only: this module reads GEMINI_API_KEY from the server environment
// and must never be imported by client code.

const sanitizeString = (value: any, fallback: string): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const isCoordinates = (value: any): value is Coordinates =>
  value != null &&
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number' &&
  Number.isFinite(value.latitude) &&
  Number.isFinite(value.longitude) &&
  Math.abs(value.latitude) <= 90 &&
  Math.abs(value.longitude) <= 180;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const findHiddenPlaces = async (coords: Coordinates): Promise<Place[]> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server");

  const ai = new GoogleGenAI({ apiKey });

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
};

// Web-standard handler for POST /api/hidden-places.
// Body: { latitude: number, longitude: number }. Response: Place[].
export const handleHiddenPlacesRequest = async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let coords: unknown;
  try {
    coords = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!isCoordinates(coords)) {
    return json({ error: 'Expected { latitude, longitude } as numbers' }, 400);
  }

  try {
    const places = await findHiddenPlaces({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return json(places);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return json({ error: 'Failed to discover places' }, 502);
  }
};
