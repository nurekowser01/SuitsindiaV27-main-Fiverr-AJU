/**
 * Production Frontend Server
 *
 * Serves the React build and proxies all non-static requests to the FastAPI backend.
 * The backend handles route validation, SEO injection, 404s, and all API endpoints.
 *
 * Static assets (JS, CSS, images) are served directly from build/.
 * All other requests (GET pages, POST/PATCH/PUT/DELETE API calls) are proxied to backend.
 */

const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND_HOST = 'backend';
const BACKEND_PORT = 8001;
const BUILD_DIR = path.join(__dirname, 'build');

const app = express();

// Health check for K8s probes
app.get('/healthz', (_req, res) => res.send('ok'));

// Serve static files from build/ (JS, CSS, images, fonts, manifest, etc.)
// index: false prevents auto-serving index.html for directory requests
if (fs.existsSync(BUILD_DIR)) {
  //app.use(express.static(BUILD_DIR, { index: false }));
  app.use(express.static(BUILD_DIR));

}

// Catch-all: proxy ALL remaining requests to the backend
// Handles both page requests (GET) and API requests (POST/PATCH/PUT/DELETE)
// This ensures the app works regardless of how the production routing is configured
app.use((req, res) => {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    timeout: 30000,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);

    const skip = new Set(['transfer-encoding', 'connection', 'keep-alive']);
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (!skip.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[server] Backend proxy error: ${err.message}`);
    // Always return 503 when backend is down — never serve index.html with 200
    // Serving 200 for all URLs during backend downtime causes SEO "soft 404" penalties
    if (req.method === 'GET') {
      res.status(503).send('<!DOCTYPE html><html><head><meta name="robots" content="noindex"><title>Service Unavailable</title></head><body><h1>503 Service Temporarily Unavailable</h1><p>Please try again in a moment.</p></body></html>');
    } else {
      res.status(502).json({ detail: 'Backend unavailable' });
    }
  });

  proxyReq.on('timeout', () => {
    console.error('[server] Backend proxy timeout');
    proxyReq.destroy();
    res.status(504).json({ detail: 'Gateway timeout' });
  });

  // Pipe the request body for POST/PATCH/PUT requests
  req.pipe(proxyReq);
});

app.listen(PORT, HOST, () => {
  console.log(`[server] Running on ${HOST}:${PORT}`);
  console.log(`[server] Static files: ${BUILD_DIR}`);
  console.log(`[server] Backend proxy: ${BACKEND_HOST}:${BACKEND_PORT}`);
});
