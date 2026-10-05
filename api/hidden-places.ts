import { handleHiddenPlacesRequest } from "../server/hiddenPlaces";

// Serverless entry point (Vercel-style `api/` route). Set GEMINI_API_KEY in the
// host's environment variables; it is read at request time and never shipped
// to the browser.
export const POST = handleHiddenPlacesRequest;
