#!/usr/bin/env node
/**
 * Development server with proper TypeScript compilation
 */

const express = require('express');
const { createServer } = require('vite');
const path = require('path');

async function startDevServer() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.resolve(__dirname, 'client'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    },
  });

  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  // Backend API routes
  app.use('/api', (req, res, next) => {
    // Import and use backend routes
    require('./server/index.ts');
    next();
  });

  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Development server running on http://localhost:${port}`);
    console.log(`📱 Telegram Mini App ready for testing`);
  });
}

startDevServer().catch(console.error);