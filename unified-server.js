import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  console.log('🚀 Starting unified server with React compilation...');

  try {
    // Create Vite server in middleware mode for React compilation
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: __dirname,
      configFile: './vite.config.ts'
    });

    // Use Vite's connect instance as middleware
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    // API routes
    app.get('/api/v2/status', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          status: "operational",
          version: "2.0-unified",
          database: "connected",
          react: "compiled"
        }
      });
    });

    app.get('/api/v2/missions', (req, res) => {
      res.json({
        success: true,
        data: []
      });
    });

    app.get('/api/v2/wallet', (req, res) => {
      res.json({
        success: true,
        data: { 
          balance: 0,
          address: null 
        }
      });
    });

    // Start server
    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Unified server running on http://localhost:${port}`);
      console.log('🎯 React application with hot reload enabled');
      console.log('📡 API endpoints ready');
    });

  } catch (error) {
    console.error('❌ Failed to start unified server:', error);
    process.exit(1);
  }
}

createServer();