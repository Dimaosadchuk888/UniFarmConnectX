const express = require('express');
const path = require('path');
const { createServer } = require('vite');

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // API endpoints
    app.use(express.json());
    
    app.get('/api/v2/status', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          status: 'operational',
          version: '2.0-working',
          database: 'connected'
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
        data: { balance: 0 }
      });
    });

    // Vite dev server в middleware режиме
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(__dirname, 'client'),
      publicDir: path.resolve(__dirname, 'client/public')
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Сервер запущен на http://localhost:${port}`);
      console.log(`📡 API: http://localhost:${port}/api/v2/`);
      console.log(`🌐 Frontend: http://localhost:${port}/`);
    });

  } catch (error) {
    console.error('❌ Ошибка запуска:', error);
    process.exit(1);
  }
}

startServer();