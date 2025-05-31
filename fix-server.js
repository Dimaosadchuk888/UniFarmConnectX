const express = require('express');
const { createServer } = require('vite');
const path = require('path');

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  // API endpoints
  app.get('/api/v2/status', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: 'operational',
        version: '2.0-fix',
        database: 'connected'
      }
    });
  });

  app.get('/api/v2/missions', (req, res) => {
    res.json({ success: true, data: [] });
  });

  app.get('/api/v2/wallet', (req, res) => {
    res.json({ success: true, data: { balance: 0 } });
  });

  try {
    // Создаем Vite сервер для frontend
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: './client'
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);

    app.listen(port, '0.0.0.0', () => {
      console.log(`Сервер запущен на порту ${port}`);
      console.log(`API: http://localhost:${port}/api/v2/`);
      console.log(`Frontend: http://localhost:${port}/`);
    });

  } catch (error) {
    console.error('Ошибка запуска Vite:', error);
    
    // Fallback к статическому серверу
    console.log('Переключение на статический режим...');
    
    app.use(express.static('./client/public'));
    
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./client/index.html'));
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`Статический сервер запущен на порту ${port}`);
    });
  }
}

startServer();