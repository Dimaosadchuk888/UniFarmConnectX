/**
 * UniFarm Main Server
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const userId = 'user_' + Date.now();
      const guestId = 'guest_' + Date.now();
      const userData = {
        id: parseInt(userId.replace('user_', '')),
        user_id: userId,
        telegram_id: req.headers['x-telegram-user-id'] || '123456789',
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        guest_id: guestId,
        balance_uni: '1000',
        balance_ton: '5',
        uni_farming_balance: '250',
        uni_farming_rate: '0.5',
        uni_deposit_amount: '500',
        ref_code: 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        parent_ref_code: null,
        wallet: null,
        ton_wallet_address: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: userData
      });
    });

    // TON Farming API
    app.get(`${apiPrefix}/ton-farming/info`, (req, res) => {
      const farmingData = {
        user_id: req.query.user_id || 'user_' + Date.now(),
        ton_farming_active: true,
        ton_balance: '2.5',
        ton_rate: '0.1',
        ton_accumulated: '1.2',
        last_claim: new Date().toISOString(),
        next_claim_available: new Date(Date.now() + 3600000).toISOString()
      };

      res.json({
        success: true,
        data: farmingData
      });
    });

    // UNI Farming API
    app.get(`${apiPrefix}/uni-farming/status`, (req, res) => {
      const farmingStatus = {
        user_id: req.query.user_id || 'user_' + Date.now(),
        uni_farming_active: true,
        uni_balance: '500',
        uni_rate: '0.5',
        uni_accumulated: '125',
        farming_start_time: new Date(Date.now() - 7200000).toISOString(),
        last_update: new Date().toISOString()
      };

      res.json({
        success: true,
        data: farmingStatus
      });
    });

    // API для генерации реферального кода
    app.post(`${apiPrefix}/users/generate-ref-code`, (req, res) => {
      const refCode = 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      res.json({
        success: true,
        data: {
          ref_code: refCode
        }
      });
    });

    // API для получения обновленных данных пользователя
    app.get(`${apiPrefix}/users/current`, (req, res) => {
      const userId = 'user_' + Date.now();
      const userData = {
        id: parseInt(userId.replace('user_', '')),
        user_id: userId,
        telegram_id: req.headers['x-telegram-user-id'] || '123456789',
        username: 'demo_user',
        first_name: 'Demo',
        last_name: 'User',
        guest_id: 'guest_' + Date.now(),
        balance_uni: '1000',
        balance_ton: '5',
        ref_code: 'REF_' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        parent_ref_code: null,
        wallet: null,
        ton_wallet_address: null
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
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, request) => {
      console.log('✅ WebSocket соединение установлено');
      
      // Отправляем приветственное сообщение
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
      }));

      // Обработка входящих сообщений
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 WebSocket сообщение:', message.type);

          // Обработка ping сообщений
          if (message.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('❌ Ошибка обработки WebSocket сообщения:', error);
        }
      });

      // Обработка закрытия соединения
      ws.on('close', (code, reason) => {
        console.log('📴 WebSocket соединение закрыто:', code, reason.toString());
      });

      // Обработка ошибок
      ws.on('error', (error) => {
        console.error('❌ WebSocket ошибка:', error);
      });
    });

    console.log('🔌 WebSocket сервер настроен на /ws');

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