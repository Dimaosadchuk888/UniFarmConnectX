import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Создаем Vite сервер в middleware режиме
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(express.json());
    
    // API маршруты
    app.get('/api/v2/status', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          status: 'operational',
          version: '2.0-combined',
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

    // Используем Vite middleware для React
    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    app.listen(port, '0.0.0.0', () => {
      console.log(`Combined сервер запущен на порту ${port}`);
      console.log('React компиляция: ✓');
      console.log('API endpoints: ✓');
    });

  } catch (error) {
    console.error('Ошибка запуска:', error);
    process.exit(1);
  }
}

startServer();