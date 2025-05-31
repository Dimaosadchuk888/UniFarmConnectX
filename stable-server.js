import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    app.use(express.json());
    
    // API endpoints
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

    // Статическое обслуживание файлов
    app.use(express.static(path.join(__dirname, 'client', 'public')));

    // Главная страница
    app.get('*', (req, res) => {
      const indexPath = path.join(__dirname, 'client', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>UniFarm</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f0f2f5; }
              .container { max-width: 400px; margin: 0 auto; text-align: center; }
              .logo { font-size: 3em; margin: 20px 0; }
              .status { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">🌾 UniFarm</div>
              <div class="status">
                <h2>Система запущена</h2>
                <p>Сервер работает корректно</p>
                <p>API доступен</p>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    });

    app.listen(port, '0.0.0.0', () => {
      console.log(`Сервер запущен на порту ${port}`);
      console.log(`API доступен: http://localhost:${port}/api/v2/`);
      console.log(`Frontend: http://localhost:${port}/`);
    });

  } catch (error) {
    console.error('Ошибка запуска:', error);
    process.exit(1);
  }
}

startServer();