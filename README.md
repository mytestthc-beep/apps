<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/122pj_8_bWNXJaR43HCBmXpwd6loUijcr

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## How the Gemini key is kept secret

The browser never sees `GEMINI_API_KEY`. The app calls `POST /api/hidden-places`, and the Gemini request is made server-side in `server/hiddenPlaces.ts`.

- **Local (`npm run dev` / `npm run preview`):** a Vite plugin in `vite.config.ts` serves the endpoint and reads the key from `.env.local`.
- **Deploying:** `api/hidden-places.ts` is a serverless function in the `api/` folder layout Vercel uses. Set `GEMINI_API_KEY` in the host's environment variables. Other hosts can mount `handleHiddenPlacesRequest` (a standard `Request` → `Response` handler) the same way.
