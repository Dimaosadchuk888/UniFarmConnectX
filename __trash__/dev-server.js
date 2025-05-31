import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Создаем Vite сервер в middleware режиме
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    root: path.join(__dirname, 'client')
  });

  // Используем Vite middleware
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);

  // API маршруты
  app.get('/api/v2/status', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: "operational",
        version: "2.0-dev",
        database: "connected"
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

  // Для всех остальных запросов возвращаем index.html
  app.get('*', async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: 'API endpoint not found' });
    }

    try {
      const url = req.originalUrl;
      const template = await vite.transformIndexHtml(url, `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>UniFarm</title>
          <script src="https://telegram.org/js/telegram-web-app.js"></script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
        </html>
      `);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Dev сервер запущен на http://localhost:${port}`);
    console.log('🚀 React приложение доступно для разработки');
  });
}

createServer().catch(err => {
  console.error('❌ Ошибка запуска dev сервера:', err);
  process.exit(1);
});