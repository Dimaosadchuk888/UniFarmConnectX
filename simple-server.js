// DEPRECATED: Use server/index.ts as the main server entry point
/*
import express from 'express';
import path from 'path';
import { createServer } from 'vite';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3001;

  // CORS and basic middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Basic API routes
  app.use('/api/v2', (req, res) => {
    res.json({ message: 'API готов к работе' });
  });

  // Vite dev server for React app
  const vite = await createServer({
    root: path.resolve(process.cwd(), 'client'),
    server: { 
      middlewareMode: true,
      host: '0.0.0.0',
      allowedHosts: [
        'localhost',
        '.replit.dev',
        '.replit.app',
        '.repl.co'
      ]
    },
    appType: 'custom',
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client', 'src'),
        '@shared': path.resolve(process.cwd(), 'shared'),
        '@assets': path.resolve(process.cwd(), 'attached_assets'),
      },
    },
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = await vite.transformIndexHtml(url, `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UniFarm - Crypto Farming Platform</title>
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

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 UniFarm сервер запущен на http://0.0.0.0:${port}`);
    console.log(`📡 API доступен: http://0.0.0.0:${port}/api/v2/`);
    console.log(`🌐 Frontend: http://0.0.0.0:${port}/`);
  });

  return server;
}

startServer().catch(console.error);
*/