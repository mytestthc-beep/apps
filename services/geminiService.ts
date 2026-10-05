import { Coordinates, Place } from "../types";

// The Gemini call runs server-side (see server/hiddenPlaces.ts) so the API key
// never reaches the browser. This client only talks to our own endpoint.
export const findHiddenPlaces = async (coords: Coordinates): Promise<Place[]> => {
  try {
    const response = await fetch('/api/hidden-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const places = await response.json();
    return Array.isArray(places) ? places : [];
  } catch (error) {
    console.error("Hidden places request failed:", error);
    // Ensure we throw a simple Error object with a string message
    throw new Error("Failed to discover places. The spirits are quiet today.");
  }
};
