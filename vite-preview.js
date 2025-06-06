#!/usr/bin/env node
/**
 * Vite preview server for UniFarm
 */

import express from 'express';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startVitePreview() {
  const app = express();
  
  // Create Vite server in middleware mode
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
    mode: 'development',
    root: path.resolve(__dirname, 'client'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  });

  // Use vite's connect instance as middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  const port = process.env.PORT || 3000;
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Vite preview server running on http://localhost:${port}`);
    console.log(`📱 TypeScript compilation active`);
  });
}

startVitePreview().catch(console.error);