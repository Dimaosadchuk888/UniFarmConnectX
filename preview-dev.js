#!/usr/bin/env node
/**
 * Preview server with Vite development mode for proper TypeScript compilation
 */

const express = require('express');
const { createServer } = require('vite');
const path = require('path');

async function createPreviewServer() {
  const app = express();
  
  // Create Vite server in middleware mode for development
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

  const port = process.env.PORT || 3000;
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Preview server running on http://localhost:${port}`);
    console.log(`📱 Telegram Mini App ready`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Shutting down preview server...');
    server.close(() => {
      process.exit(0);
    });
  });
}

createPreviewServer().catch(console.error);