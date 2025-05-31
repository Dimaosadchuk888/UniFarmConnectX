import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Настройка API endpoints
    app.use(express.json());
    
    app.get('/api/v2/status', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          status: 'operational',
          version: '2.0-unified',
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

    // Настройка Vite для frontend
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: './client',
      configFile: './client/vite.config.ts'
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    app.listen(port, '0.0.0.0', () => {
      console.log(`✓ Unified сервер запущен на порту ${port}`);
      console.log(`✓ API доступно на http://localhost:${port}/api/v2/`);
      console.log(`✓ Frontend доступен на http://localhost:${port}/`);
    });

  } catch (error) {
    console.error('Ошибка запуска:', error);
    process.exit(1);
  }
}

startServer();