import path from 'path';
import { Readable } from 'stream';
import type { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleHiddenPlacesRequest } from './server/hiddenPlaces';

// Serves POST /api/hidden-places from the Vite dev and preview servers, so the
// Gemini key stays in this Node process instead of the client bundle.
const apiPlugin = (): Plugin => {
  const middleware: Connect.NextHandleFunction = async (
    req: IncomingMessage,
    res: ServerResponse,
    next,
  ) => {
    if (req.url?.split('?')[0] !== '/api/hidden-places') return next();
    try {
      const request = new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : (Readable.toWeb(req) as ReadableStream),
        duplex: 'half',
      } as RequestInit);
      const response = await handleHiddenPlacesRequest(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    } catch (error) {
      next(error);
    }
  };
  return {
    name: 'hidden-places-api',
    configureServer: (server) => { server.middlewares.use(middleware); },
    configurePreviewServer: (server) => { server.middlewares.use(middleware); },
  };
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Expose the key to server-side code only. Nothing here is inlined into the bundle.
    if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), apiPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
