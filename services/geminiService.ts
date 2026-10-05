import { GoogleGenAI, GroundingChunk } from "@google/genai";
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

// Lowercase and drop punctuation so "Café Lumière" and "cafe lumiere" compare equal.
const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface MapsSource {
  title: string;
  uri?: string;
  placeId?: string;
}

const getMapsSources = (chunks: GroundingChunk[] | undefined): MapsSource[] =>
  (chunks || [])
    .map((chunk) => chunk.maps)
    .filter((maps): maps is NonNullable<GroundingChunk['maps']> => !!maps?.title)
    .map((maps) => ({
      title: maps.title as string,
      uri: maps.uri,
      // The API returns resource names like "places/ChIJ..."; Maps URLs want the bare ID.
      placeId: maps.placeId?.replace(/^places\//, ''),
    }));

const findSource = (name: string, sources: MapsSource[]): MapsSource | undefined => {
  const target = normalizeName(name);
  if (!target) return undefined;
  return (
    sources.find((s) => normalizeName(s.title) === target) ||
    sources.find((s) => {
      const title = normalizeName(s.title);
      return title.length > 0 && (title.includes(target) || target.includes(title));
    })
  );
};

const buildMapsUrl = (name: string, source: MapsSource): string => {
  if (source.uri) return source.uri;
  const params = new URLSearchParams({ api: '1', query: name });
  if (source.placeId) params.set('query_place_id', source.placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

// Maps grounding can't be combined with a JSON response schema, so the model
// returns JSON as plain text, sometimes wrapped in a code fence.
const extractJsonArray = (text: string): unknown => {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
};

export const findHiddenPlaces = async (coords: Coordinates): Promise<Place[]> => {
  if (!apiKey) throw new Error("API Key not found");

  const modelId = "gemini-2.5-flash";
  const prompt = `Identify 4 "hidden gems" or lesser-known, interesting places within a 5km radius of my current location.
  Only suggest real places you found on Google Maps.
  Focus on:
  - Quiet nature spots (parks, viewpoints, paths)
  - Cozy, non-touristy cafes or small eateries
  - Unique local architecture or historical markers
  - Places that offer a moment of peace or wonder
  
  Avoid major tourist attractions or crowded malls.
  
  Respond with only a JSON array, no other text. Each item must have these string fields:
  - "name": the place's name exactly as it appears on Google Maps
  - "description": a short, evocative description (max 15 words)
  - "type": a category (e.g., Nature, Cafe, Art)
  - "reason": why this is a hidden gem
  - "estimatedDistance": estimated walking distance or time (e.g. "10 min walk")`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const rawPlaces = extractJsonArray(text);
    if (!Array.isArray(rawPlaces)) {
      console.error("Failed to parse JSON response:", text);
      return [];
    }

    const sources = getMapsSources(response.candidates?.[0]?.groundingMetadata?.groundingChunks);

    // Keep only places backed by a Google Maps result, so invented places never reach the UI.
    const places: Place[] = [];
    for (const p of rawPlaces as any[]) {
      const name = sanitizeString(p?.name, "");
      const source = findSource(name, sources);
      if (!source) {
        console.warn("Dropping place with no Google Maps match:", name);
        continue;
      }
      places.push({
        name: source.title,
        description: sanitizeString(p.description, "A hidden gem nearby."),
        type: sanitizeString(p.type, "Spot"),
        reason: sanitizeString(p.reason, "Worth checking out."),
        estimatedDistance: sanitizeString(p.estimatedDistance, "Nearby"),
        mapsUrl: buildMapsUrl(source.title, source),
      });
    }

    if (rawPlaces.length > 0 && places.length === 0) {
      throw new Error("Couldn't confirm any nearby places on Google Maps. Try again in a moment.");
    }

    return places;

  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message.startsWith("Couldn't confirm")) throw error;
    // Ensure we throw a simple Error object with a string message
    throw new Error("Failed to discover places. The spirits are quiet today.");
  }
};
