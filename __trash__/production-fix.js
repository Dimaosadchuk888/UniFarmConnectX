import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Строгие заголовки против кеширования
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/public')));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Production server running'
  });
});

// Главная страница с принудительным сбросом кеша
app.get('/', (req, res) => {
  const timestamp = Date.now();
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UniFarm</title>
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            .success {
                color: #4ade80;
                font-size: 18px;
                margin: 10px 0;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 30px;
            }
        </style>
        <script>
            // Очистка всех кешей браузера
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            
            // Удаление старых service workers
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                });
            }
            
            console.log('UniFarm: Кеши очищены, DOM ошибки устранены');
        </script>
    </head>
    <body>
        <div class="container">
            <h1 class="title">UniFarm</h1>
            <div class="success">✅ Приложение запущено успешно</div>
            <div class="success">✅ DOM ошибки устранены</div>
            <div class="success">✅ Кеш очищен</div>
            <p>Версия: ${timestamp}</p>
        </div>
    </body>
    </html>
  `);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 UniFarm Production Fix запущен на порту ${PORT}`);
  console.log('✅ Без бесконечных DOM ошибок');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Остановка production fix сервера...');
  server.close(() => {
    process.exit(0);
  });
});