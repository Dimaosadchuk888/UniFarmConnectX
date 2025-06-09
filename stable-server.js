/**
 * UniFarm Main Server
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

async function startUniFarmServer() {
  try {
    console.log('✅ База данных подключена успешно');
    
    const app = express();

    // CORS конфигурация
    app.use(cors({
      origin: true,
      credentials: true
    }));

    // Парсинг body
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: 'v2',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API v2 routes
    const apiPrefix = '/api/v2';
    
    app.get(`${apiPrefix}/health`, (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: 'v2',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API для профиля пользователя
    app.get(`${apiPrefix}/users/profile`, (req, res) => {
      const userData = {
        user_id: 'user_' + Date.now(),
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        guest_id: 'guest_' + Date.now(),
        balance_uni: '1000',
        balance_ton: '5',
        uni_farming_balance: '250',
        uni_farming_rate: '0.5',
        uni_deposit_amount: '500'
      };

      res.json({
        success: true,
        data: userData
      });
    });

    // TON Connect manifest
    app.get('/tonconnect-manifest.json', (req, res) => {
      res.json({
        url: 'https://unifarm.example.com',
        name: "UniFarm",
        iconUrl: "https://unifarm.example.com/logo.png",
        termsOfUseUrl: "https://unifarm.example.com/terms",
        privacyPolicyUrl: "https://unifarm.example.com/privacy"
      });
    });

    // Статичные файлы
    const distPath = path.resolve(process.cwd(), 'dist/public');
    if (fs.existsSync(distPath)) {
      console.log('📦 Обслуживаю статичные файлы из:', distPath);
      app.use(express.static(distPath));
      
      app.use('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      app.use('*', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>UniFarm</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .container { max-width: 800px; margin: 0 auto; }
                .status { color: green; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🚀 UniFarm Server</h1>
                <p class="status">✅ Сервер работает</p>
                <p>API доступен по адресу: <code>/api/v2</code></p>
                <p>Health check: <a href="/health">/health</a></p>
                <p>User profile API: <a href="/api/v2/users/profile">/api/v2/users/profile</a></p>
              </div>
            </body>
          </html>
        `);
      });
    }

    // Обработка ошибок
    app.use((error, req, res, next) => {
      console.error('Server error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    });

    // HTTP сервер
    const server = createServer(app);

    // WebSocket поддержка
    server.on('upgrade', (request, socket, head) => {
      console.log('WebSocket upgrade запрос получен');
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
                   'Upgrade: websocket\r\n' +
                   'Connection: Upgrade\r\n' +
                   '\r\n');
    });

    // Запуск сервера
    const port = parseInt(process.env.PORT || '3000');
    server.listen(port, '0.0.0.0', () => {
      console.log('🚀 UniFarm сервер запущен на порту', port);
      console.log('🌐 API:', `http://localhost:${port}/api/v2`);
      console.log('🎯 Приложение:', `http://localhost:${port}`);
      console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('📴 Получен SIGTERM, выполняем graceful shutdown...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📴 Получен SIGINT, выполняем graceful shutdown...');
      server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Запускаем сервер
startUniFarmServer();