/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

// Загружаем переменные окружения из .env файла в development режиме
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('[ENV] Loaded .env file in development mode');
  console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
  console.log('[ENV] BYPASS_AUTH:', process.env.BYPASS_AUTH);
}

import * as Sentry from '@sentry/node';

// Ініціалізація Sentry перед усіма іншими імпортами
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log('[Sentry] Monitoring initialized');
} else {
  console.log('[Sentry] Disabled - SENTRY_DSN not found in environment');
}

import express, { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';
// @ts-ignore
import * as WebSocket from 'ws';
import { config, logger, globalErrorHandler, notFoundHandler, EnvValidator } from '../core';
import { supabase } from '../core/supabase';
import { telegramMiddleware } from '../core/middleware/telegramMiddleware';
import { farmingScheduler } from '../core/scheduler/farmingScheduler';
import { tonBoostIncomeScheduler } from '../modules/scheduler/tonBoostIncomeScheduler';
import { alertingService } from '../core/alerting';
import { setupViteIntegration } from './setupViteIntegration';
import { BalanceNotificationService } from '../core/balanceNotificationService';
import { requireTelegramAuth } from '../core/middleware/telegramAuth';
import { AdminBotService } from '../modules/adminBot/service';
import { adminBotConfig } from '../config/adminBot';
import { metricsCollector } from '../core/metrics';
// Удаляем импорт старого мониторинга PostgreSQL пула

// API будет создан прямо в сервере

/**
 * Установка WebSocket сервера с логированием всех событий
 */
function setupWebSocketServer(httpServer: any) {
  // Инициализация WebSocket сервера с поддержкой Replit прокси
  const wss = new WebSocket.WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    perMessageDeflate: false,
    // Настройки для работы через HTTPS прокси Replit
    handleProtocols: (protocols: any, request: any) => {
      // Разрешаем любые протоколы для совместимости с WSS
      return protocols && protocols.length > 0 ? protocols[0] : false;
    },
    verifyClient: (info: any) => {
      // Принимаем все соединения для публичного доступа
      return true;
    }
  });
  
  // Хранилище активных соединений
  const activeConnections = new Map<string, any>();
  
  logger.info(`[WebSocket] Сервер инициализирован на пути /ws`);
  
  // Обработка WebSocket соединений
  wss.on('connection', (ws: any, req: any) => {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIP = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    logger.info(`[WebSocket] Новое соединение установлено`, {
      connectionId,
      clientIP,
      userAgent: userAgent?.substring(0, 100),
      totalConnections: wss.clients.size
    });
    
    // Сохраняем соединение
    activeConnections.set(connectionId, {
      ws,
      connectedAt: new Date(),
      lastPing: null,
      lastPong: null,
      userId: null
    });
    
    // Отправляем подтверждение подключения
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        connectionId,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('[WebSocket] Ошибка отправки приветствия', { connectionId, error });
    }
    
    // Обработка входящих сообщений
    ws.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        logger.info(`[WebSocket] Получено сообщение`, { 
          connectionId, 
          type: message.type,
          hasUserId: !!message.userId 
        });
        
        const connection = activeConnections.get(connectionId);
        if (!connection) return;
        
        switch (message.type) {
          case 'ping':
            // Обновляем время последнего ping
            connection.lastPing = new Date();
            
            // Отправляем pong в ответ
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: message.timestamp || new Date().toISOString()
            }));
            break;
            
          case 'pong':
            // Обновляем время последнего pong
            connection.lastPong = new Date();
            break;
            
          case 'subscribe':
            // Подписка на обновления пользователя
            if (message.userId) {
              connection.userId = message.userId;
              logger.info(`[WebSocket] Пользователь подписан на обновления`, {
                connectionId,
                userId: message.userId
              });
              
              // Регистрируем подключение в BalanceNotificationService
              const balanceService = BalanceNotificationService.getInstance();
              balanceService.registerConnection(message.userId, ws);
              
              ws.send(JSON.stringify({
                type: 'subscription_confirmed',
                userId: message.userId,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          default:
            logger.warn(`[WebSocket] Неизвестный тип сообщения`, {
              connectionId,
              messageType: message.type
            });
        }
      } catch (error) {
        logger.error('[WebSocket] Ошибка обработки сообщения', {
          connectionId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
    
    // Обработка закрытия соединения
    ws.on('close', (code: any, reason: any) => {
      const connection = activeConnections.get(connectionId);
      const duration = connection ? Date.now() - connection.connectedAt.getTime() : 0;
      
      logger.info(`[WebSocket] Соединение закрыто`, {
        connectionId,
        code,
        reason: reason.toString(),
        duration: `${Math.round(duration / 1000)}s`,
        totalConnections: wss.clients.size
      });
      
      // Удаляем подключение из BalanceNotificationService
      if (connection && connection.userId) {
        const balanceService = BalanceNotificationService.getInstance();
        balanceService.removeConnection(connection.userId, ws);
      }
      
      activeConnections.delete(connectionId);
    });
    
    // Обработка ошибок соединения
    ws.on('error', (error: any) => {
      logger.error('[WebSocket] Ошибка соединения', {
        connectionId,
        error: error.message
      });
      
      activeConnections.delete(connectionId);
    });
  });
  
  // Периодическая очистка неактивных соединений
  setInterval(() => {
    const now = new Date();
    let cleanedConnections = 0;
    
    activeConnections.forEach((connection, connectionId) => {
      const timeSinceLastPing = connection.lastPing 
        ? now.getTime() - connection.lastPing.getTime() 
        : now.getTime() - connection.connectedAt.getTime();
      
      // Если прошло больше 2 минут без ping и соединение не отвечает
      if (timeSinceLastPing > 120000) {
        try {
          if (connection.ws.readyState === 1) {
            connection.ws.terminate();
          }
        } catch (e) {
          // Игнорируем ошибки при закрытии
        }
        
        activeConnections.delete(connectionId);
        cleanedConnections++;
      }
    });
    
    if (cleanedConnections > 0) {
      logger.info(`[WebSocket] Очищено неактивных соединений: ${cleanedConnections}`);
    }
  }, 60000); // Каждую минуту
  
  return wss;
}

async function startServer() {
  try {
    // Валидация переменных окружения перед запуском сервера
    logger.info('🔍 Проверка переменных окружения...');
    EnvValidator.validateAndReport();

    const app = express();

    // Compression middleware для улучшения производительности
    app.use(compression({
      level: 6, // Баланс между скоростью и степенью сжатия
      threshold: 1024, // Сжимать ответы больше 1KB
      filter: (req, res) => {
        // Сжимать все текстовые форматы
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Sentry middleware disabled for deployment compatibility

    // TELEGRAM WEBHOOK - МАКСИМАЛЬНЫЙ ПРИОРИТЕТ (первая регистрация)
    const webhookHandler = async (req: Request, res: Response): Promise<void> => {
      try {
        const update = req.body;
        
        logger.info('[TelegramWebhook] Получено обновление от Telegram', {
          update_id: update.update_id,
          message: update.message ? {
            message_id: update.message.message_id,
            from: update.message.from,
            text: update.message.text
          } : null
        });

        // Обработка команды /start
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
          const chatId = update.message.chat.id;
          
          logger.info('[TelegramWebhook] Обработка команды /start', {
            chat_id: chatId,
            user_id: update.message.from.id
          });

          // Отправляем ответ с кнопкой Mini App
          try {
            const { TelegramService } = await import('../modules/telegram/service');
            const telegramService = new TelegramService();
            
            await telegramService.sendMessage(chatId, 
              '🌾 Добро пожаловать в UniFarm Connect!\n\n' +
              'Начните фармить UNI и TON токены прямо сейчас!', 
              {
                reply_markup: {
                  inline_keyboard: [[{
                    text: '🚀 Запустить UniFarm',
                    web_app: { url: process.env.APP_DOMAIN || process.env.TELEGRAM_WEBAPP_URL || 'https://t.me/UniFarming_Bot' }
                  }]]
                }
              }
            );
          } catch (serviceError) {
            logger.error('[TelegramWebhook] Ошибка отправки сообщения', { 
              error: serviceError instanceof Error ? serviceError.message : String(serviceError) 
            });
          }
        }

        res.json({ 
          success: true,
          status: 'webhook_processed',
          update_id: update.update_id,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('[TelegramWebhook] Ошибка обработки webhook', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        res.status(500).json({
          success: false,
          error: 'Webhook processing error'
        });
      }
    };

    // Регистрируем webhook handler на множественных путях
    app.post('/webhook', express.json({ limit: '1mb' }), webhookHandler);
    app.post('/api/webhook', express.json({ limit: '1mb' }), webhookHandler);
    app.post('/bot/webhook', express.json({ limit: '1mb' }), webhookHandler);
    app.post('/telegram/webhook', express.json({ limit: '1mb' }), webhookHandler);

    // Fallback polling service для обхода блокировки webhook
    const initPollingFallback = async () => {
      try {
        // Проверяем доступность webhook через внешний домен
        const webhookUrl = process.env.APP_DOMAIN || process.env.TELEGRAM_WEBHOOK_URL || 'https://uni-farm-connect-x-ab245275.replit.app';
        const testResponse = await fetch(`${webhookUrl}/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        });
        
        if (testResponse.status === 404) {
          logger.info('[TelegramPolling] Webhook заблокирован, активируем polling service');
          
          // Простой polling механизм
          let offset = 0;
          const pollTelegram = async () => {
            try {
              const botToken = process.env.TELEGRAM_BOT_TOKEN;
              const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offset, timeout: 10 })
              });
              
              const data = await updatesResponse.json() as any;
              if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                  await webhookHandler({ body: update } as Request, {
                    json: (data: any) => logger.info('[TelegramPolling] Processed:', data),
                    status: () => ({ json: () => {} })
                  } as any);
                  offset = update.update_id + 1;
                }
              }
            } catch (error) {
              logger.error('[TelegramPolling] Polling error:', error instanceof Error ? error.message : String(error));
            }
            
            setTimeout(pollTelegram, 3000); // Poll every 3 seconds
          };
          
          // Удаляем webhook и запускаем polling
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
          setTimeout(pollTelegram, 5000); // Start polling after 5 seconds
        } else {
          logger.info('[TelegramPolling] Webhook работает корректно');
        }
      } catch (error) {
        logger.error('[TelegramPolling] Ошибка инициализации:', error instanceof Error ? error.message : String(error));
      }
    };
    
    // Запускаем проверку через 15 секунд после старта сервера
    setTimeout(initPollingFallback, 15000);

    // Блокировка доступа к конфиденциальным файлам (КРИТИЧЕСКАЯ ЗАЩИТА)
    app.use('/.env', (_, res) => res.status(403).send('Forbidden'));
    app.use('/.replit', (_, res) => res.status(403).send('Forbidden'));
    app.use('/config', (_, res) => res.status(403).send('Forbidden'));
    app.use('/.git', (_, res) => res.status(403).send('Forbidden'));
    app.use('/node_modules', (_, res) => res.status(403).send('Forbidden'));

    // Rate limiting ПОЛНОСТЬЮ ОТКЛЮЧЕН для production использования
    // const limiter = rateLimit({...}); // ОТКЛЮЧЕН
    
    // Применяем rate limiting ко всем маршрутам - ОТКЛЮЧЕН
    // app.use(limiter); // ОТКЛЮЧЕН
    
    logger.info('[Server] Express Rate Limiting ПОЛНОСТЬЮ ОТКЛЮЧЕН');

    // Middleware
    app.use(cors({
      origin: config.security.cors.origin,
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Performance metrics middleware
    app.use(metricsCollector.apiMetricsMiddleware());

    // Логирование запросов
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // T15 Auto Migration - ОТКЛЮЧЕНО (несовместимо с Supabase API)
    // Прямые SQL запросы должны выполняться через Supabase Dashboard
    const executeT15Migration = async () => {
      try {
        logger.info('[T15] Starting database schema synchronization');
        
        const operations = [
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE',
          'ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_ref_code TEXT',
          'ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_user_id INTEGER',
          'CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)',
          'CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code)',
          `UPDATE users SET ref_code = 'REF' || telegram_id || extract(epoch from now())::bigint WHERE ref_code IS NULL AND telegram_id IS NOT NULL`
        ];

        let successCount = 0;
        
        for (const operation of operations) {
          try {
            await supabase.rpc('execute_sql', { sql_command: operation });
            successCount++;
          } catch (error) {
            logger.warn(`[T15] Operation warning: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        if (successCount >= 4) {
          logger.info('[T15] ✅ Database schema synchronized - referral system activated');
        } else {
          logger.warn('[T15] ⚠️ Partial synchronization - some features may be limited');
        }
        
      } catch (error) {
        logger.error('[T15] Migration error:', error instanceof Error ? error.message : String(error));
      }
    };

    // Выполняем T15 миграцию после подключения к базе
    // ОТКЛЮЧЕНО: прямые SQL запросы не поддерживаются в Supabase API
    // setTimeout(executeT15Migration, 5000);

    // Health check (должен быть первым для мониторинга)
    app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });

    // JWT debug endpoint
    app.get('/api/v2/debug/jwt', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      console.log('[JWT Debug] Auth header:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({
          success: false,
          error: 'No JWT token provided',
          auth_header: authHeader || 'none'
        });
      }
      
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
          return res.json({
            success: false,
            error: 'JWT_SECRET not configured',
            env_check: 'JWT_SECRET' in process.env
          });
        }
        
        const decoded = jwt.verify(token, jwtSecret);
        res.json({
          success: true,
          decoded,
          jwt_secret_preview: jwtSecret.substring(0, 10) + '...'
        });
      } catch (error: any) {
        res.json({
          success: false,
          error: 'JWT verification failed',
          message: error.message
        });
      }
    });





    // API routes
    const apiPrefix = `/api/v2`;
    
    // Performance metrics endpoint
    app.get(`${apiPrefix}/metrics`, async (req: Request, res: Response) => {
      try {
        const metrics = metricsCollector.getMetricsSummary();
        res.json({
          success: true,
          data: metrics
        });
      } catch (error) {
        logger.error('[Metrics] Error getting metrics summary:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get metrics'
        });
      }
    });
    
    // Bypass auth middleware - ONLY for explicit development mode
    const forceBypass = process.env.BYPASS_AUTH === 'true' || process.env.NODE_ENV === 'development';
    
    if (forceBypass) {
      console.log('[Server] Development mode - auth bypass enabled');
      // В development режиме используется JWT авторизация без принудительного user ID
    }
    
    // КРИТИЧЕСКИЙ ИСПРАВЛЕННЫЙ DAILY BONUS ENDPOINT
    app.get(`${apiPrefix}/daily-bonus-fixed`, async (req: Request, res: Response): Promise<any> => {
      try {
        const userId = req.query.user_id;
        if (!userId) {
          return res.status(400).json({ success: false, error: 'Missing user_id parameter' });
        }
        
        const userIdNumber = parseInt(userId as string);
        if (isNaN(userIdNumber)) {
          return res.json({ success: false, error: 'Invalid user ID' });
        }
        
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userIdNumber)
          .limit(1);
        
        if (error) {
          return res.json({ success: false, error: error.message });
        }
        
        const user = users?.[0];
        if (!user) {
          return res.json({
            success: true,
            data: { canClaim: true, streak: 0, bonusAmount: 500 }
          });
        }
        
        const now = new Date();
        const lastClaimDate = user.checkin_last_date ? new Date(user.checkin_last_date) : null;
        let canClaim = true;
        let streakDays = user.checkin_streak || 0;
        
        if (lastClaimDate) {
          const daysSinceLastClaim = Math.floor((now.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceLastClaim < 1) canClaim = false;
          else if (daysSinceLastClaim > 1) streakDays = 0;
        }
        
        const bonusAmount = Math.min(500 + (streakDays * 100), 2000);
        
        logger.info('[DailyBonus] Success response', {
          userId: userIdNumber,
          canClaim,
          streakDays,
          bonusAmount
        });
        
        res.json({
          success: true,
          data: { canClaim, streak: streakDays, bonusAmount }
        });
      } catch (error) {
        logger.error('[DailyBonus] Error:', error);
        res.json({ success: false, error: 'Internal server error' });
      }
    });

    // Debug endpoint для проверки переменных окружения
    app.get(`${apiPrefix}/debug/env`, (req: Request, res: Response) => {
      res.json({
        NODE_ENV: process.env.NODE_ENV,
        BYPASS_AUTH: process.env.BYPASS_AUTH,
        PORT: process.env.PORT,
        has_supabase: !!process.env.SUPABASE_URL,
        env_loaded: true
      });
    });

    // ТЕСТОВЫЙ РОУТ ПЕРЕД ИМПОРТОМ ROUTES - ПРОВЕРКА ПРИОРИТЕТА
    app.get(`${apiPrefix}/ref-debug-test`, (req: Request, res: Response) => {
      console.log('[DIRECT ROUTE] 🔥 REF DEBUG TEST WORKS DIRECTLY!');
      res.json({ success: true, message: 'Direct referral debug test works', timestamp: Date.now() });
    });
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Прямой endpoint для farming status
    app.get(`${apiPrefix}/uni-farming/status`, requireTelegramAuth, async (req: Request, res: Response) => {
      try {
        console.log('[DIRECT FARMING] 🔥 DIRECT FARMING STATUS ENDPOINT WORKS!');
        const userId = req.query.user_id || (req as any).user?.id;
        
        if (!userId) {
          return res.status(400).json({ 
            success: false, 
            error: 'Missing user_id parameter',
            receivedQuery: req.query,
            receivedUser: (req as any).user
          });
        }
        
        // Получаем данные пользователя из Supabase
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error || !user) {
          return res.status(404).json({ 
            success: false, 
            error: 'User not found',
            details: error?.message 
          });
        }
        
        // Возвращаем данные фарминга
        res.json({
          success: true,
          data: {
            user_id: user.id,
            balance_uni: parseFloat(user.balance_uni?.toString() || "0"),
            uni_farming_active: user.uni_farming_active || false,
            uni_deposit_amount: parseFloat(user.uni_deposit_amount?.toString() || "0"),
            uni_farming_balance: parseFloat(user.uni_farming_balance?.toString() || "0"),
            uni_farming_rate: parseFloat(user.uni_farming_rate?.toString() || "0"),
            uni_farming_start_timestamp: user.uni_farming_start_timestamp,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error('[DIRECT FARMING] Ошибка:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Removed test handler that was intercepting /api/v2/users/profile requests
    
    // Import centralized routes (after critical endpoints)
    console.log('[ROUTES] Attempting to import ./routes_minimal_test...');
    try {
      const { default: apiRoutes } = await import('./routes_minimal_test');
      console.log('[ROUTES] Successfully imported routes_minimal_test, registering...');
      
      // Debug middleware to log all API requests
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
          console.log(`[API REQUEST] ${req.method} ${req.path}`);
          console.log('[API REQUEST] Headers:', req.headers.authorization ? 'Has Auth' : 'No Auth');
        }
        next();
      });
      
      // Specific debug for /users endpoints
      app.use('/api/v2/users', (req, res, next) => {
        console.log('[DEBUG /users] Request to:', req.path);
        console.log('[DEBUG /users] Full URL:', req.originalUrl);
        console.log('[DEBUG /users] Method:', req.method);
        next();
      });
      
      app.use(apiPrefix, apiRoutes);
      console.log('[ROUTES] Routes registered successfully at', apiPrefix);
      
      // Добавляем поддержку /api для обратной совместимости
      app.use('/api', apiRoutes);
      
      // Добавляем webhook на корневом уровне
      app.use('/', apiRoutes);
      
    } catch (routesError: unknown) {
      console.error('[ROUTES] CRITICAL ERROR: Failed to import routes:', routesError);
      console.error('[ROUTES] Stack trace:', routesError instanceof Error ? routesError.stack : 'No stack trace');
    }
    



    














    // Port configuration
    const apiPort = config.app.port;
    
    // Middleware для обхода блокировки хостов Vite на Replit
    app.use((req, res, next) => {
      // Подменяем заголовок Host для Vite
      if (req.headers.host && req.headers.host.includes('replit')) {
        req.headers['x-original-host'] = req.headers.host;
        req.headers.host = 'localhost:3000';
      }
      next();
    });
    
    // Static file serving for PWA files (before Vite)
    app.get('/manifest.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(path.resolve('client/public/manifest.json'));
    });
    
    // TON Connect manifest for wallet integration
    app.get('/tonconnect-manifest.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(path.resolve('client/public/tonconnect-manifest.json'));
    });

    // Тестовый endpoint для демонстрации WebSocket уведомлений
    app.post('/api/v2/test/balance-notification', express.json(), async (req: Request, res: Response) => {
      try {
        const { userId, changeAmount, currency } = req.body;
        
        if (!userId || !changeAmount || !currency) {
          return res.status(400).json({
            success: false,
            error: 'Требуются параметры: userId, changeAmount, currency'
          });
        }

        const balanceService = BalanceNotificationService.getInstance();
        
        // Отправляем тестовое уведомление
        balanceService.notifyBalanceUpdate({
          userId: parseInt(userId),
          balanceUni: currency === 'UNI' ? 1000 + parseFloat(changeAmount) : 1000,
          balanceTon: currency === 'TON' ? 500 + parseFloat(changeAmount) : 500,
          changeAmount: parseFloat(changeAmount),
          currency: currency as 'UNI' | 'TON',
          source: 'farming',
          timestamp: new Date().toISOString()
        });

        logger.info('[TEST] Отправлено тестовое уведомление о балансе', {
          userId,
          changeAmount,
          currency
        });

        res.json({
          success: true,
          message: 'Тестовое уведомление отправлено',
          data: { userId, changeAmount, currency }
        });
      } catch (error) {
        logger.error('[TEST] Ошибка отправки тестового уведомления', { error });
        res.status(500).json({
          success: false,
          error: 'Ошибка сервера'
        });
      }
    });
    
    // Проверяем существование dist папки
    const fs = await import('fs');
    const distPath = path.resolve(process.cwd(), 'dist', 'public');
    const distExists = fs.existsSync(distPath);
    
    // Подключаем Vite интеграцию всегда если нет собранных файлов
    if (!distExists || process.env.NODE_ENV !== 'production') {
      logger.info(`[Vite] Включаем Vite интеграцию (dist не найден или dev режим)`);
      await setupViteIntegration(app);
    }
    
    // В режиме production и если есть dist - используем статические файлы
    if (process.env.NODE_ENV === 'production' && distExists) {
      logger.info(`[Static Files] Serving from: ${distPath}`);
      app.use(express.static(distPath, {
        maxAge: '0',
        etag: false,
        lastModified: false,
        setHeaders: (res, path) => {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }));
    } else if (process.env.NODE_ENV === 'production') {
      logger.warn(`[Static Files] Папка dist не найдена! Используем Vite в production режиме.`);
    }
    
    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes, static assets and webhook
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/assets/') ||
          req.path.startsWith('/health') || 
          req.path === '/webhook' || 
          req.path === '/manifest.json' || 
          req.path === '/tonconnect-manifest.json') {
        return next();
      }
      
      // В режиме разработки отдаем client/index.html
      const indexPath = process.env.NODE_ENV === 'production' 
        ? path.resolve(process.cwd(), 'dist', 'public', 'index.html')
        : path.resolve(process.cwd(), 'client', 'index.html');
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(indexPath);
    });

    // ДОПОЛНИТЕЛЬНЫЕ WEBHOOK МАРШРУТЫ для надежности
    app.all('/webhook', express.json(), async (req: Request, res: Response) => {
      try {
        const update = req.body;
        logger.info('[TelegramWebhook] Получено обновление (fallback)', {
          method: req.method,
          update_id: update?.update_id
        });
        
        res.json({ 
          success: true,
          status: 'webhook_processed_fallback',
          update_id: update?.update_id || 'unknown'
        });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Webhook error' });
      }
    });

    // Sentry error handler disabled for deployment compatibility

    // Error handlers (must be last)
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    
    // Создаем HTTP сервер для WebSocket интеграции
    const httpServer = createServer(app);
    
    // Устанавливаем WebSocket сервер
    const wss = setupWebSocketServer(httpServer);
    
    // Запуск сервера с принудительным использованием 0.0.0.0 для контейнерной среды
    const deploymentHost = '0.0.0.0'; // Всегда используем 0.0.0.0 для доступности извне
    const server = httpServer.listen(Number(apiPort), deploymentHost, () => {
      logger.info(`🚀 API сервер запущен на http://0.0.0.0:${apiPort}`);
      logger.info(`📡 API доступен: http://localhost:${apiPort}${apiPrefix}/`);
      logger.info(`🔌 WebSocket сервер активен на ws://localhost:${apiPort}/ws`);
      logger.info(`🌐 Frontend: http://localhost:${apiPort}/ (Static files from dist)`);
      
      // Supabase API не требует мониторинга connection pool
      logger.info('✅ Supabase database connection active');
      
      // Инициализация фарминг-планировщика
      try {
        farmingScheduler.start();
        logger.info('✅ Фарминг-планировщик запущен');
      } catch (error) {
        logger.error('❌ Ошибка запуска фарминг-планировщика', { error });
      }
      
      // Инициализация TON Boost планировщика
      try {
        tonBoostIncomeScheduler.start();
        logger.info('✅ TON Boost планировщик запущен');
      } catch (error) {
        logger.error('❌ Ошибка запуска TON Boost планировщика', { error });
      }

      // Start performance metrics logging
      try {
        metricsCollector.startMetricsLogging(300000); // Log metrics every 5 minutes
        logger.info('✅ Performance metrics logging started');
      } catch (error) {
        logger.error('❌ Error starting metrics logging', { error });
      }
      
      // Инициализация админ-бота
      (async () => {
        try {
          const adminBot = new AdminBotService();
          const appUrl = process.env.APP_DOMAIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
          const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
          
          const webhookSet = await adminBot.setupWebhook(webhookUrl);
          if (webhookSet) {
            logger.info('✅ Admin bot webhook установлен', { webhookUrl });
          } else {
            // Fallback to polling if webhook fails
            await adminBot.startPolling();
            logger.info('✅ Admin bot polling запущен');
          }
        } catch (error) {
          logger.error('❌ Ошибка инициализации админ-бота', { error });
        }
      })();
      
      // Инициализация системы алертинга для production мониторинга
      try {
        alertingService.startMonitoring(60000); // Проверка каждую минуту
        logger.info('✅ Система алертинга запущена');
      } catch (error) {
        logger.error('❌ Ошибка запуска системы алертинга', { error });
      }
      
      // Enhanced graceful shutdown для production
      const gracefulShutdown = async (signal: string) => {
        logger.info(`🔄 Получен сигнал ${signal}, начинаем graceful shutdown...`);
        
        // Устанавливаем флаг для отклонения новых запросов
        app.set('isShuttingDown', true);
        
        // Даём 30 секунд на завершение текущих операций
        const shutdownTimeout = setTimeout(() => {
          logger.error('⏱ Превышен таймаут graceful shutdown, принудительное завершение');
          process.exit(1);
        }, 30000);
        
        try {
          // 1. Останавливаем прием новых WebSocket соединений
          wss.close(() => {
            logger.info('✅ WebSocket сервер остановлен');
          });
          
          // 2. Закрываем активные WebSocket соединения
          wss.clients.forEach((ws) => {
            ws.close(1001, 'Server shutting down');
          });
          
          // 3. Останавливаем планировщики
          farmingScheduler.stop();
          logger.info('✅ Фарминг-планировщик остановлен');
          
          tonBoostIncomeScheduler.stop();
          logger.info('✅ TON Boost планировщик остановлен');
          
          // 4. Останавливаем мониторинг
          alertingService.stopMonitoring();
          logger.info('✅ Система алертинга остановлена');
          
          // 5. Закрываем HTTP сервер
          await new Promise((resolve) => {
            server.close(resolve);
          });
          logger.info('✅ HTTP сервер остановлен');
          
          // 6. Финальная очистка
          clearTimeout(shutdownTimeout);
          logger.info('✅ Graceful shutdown завершен успешно');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Ошибка при graceful shutdown', { error });
          clearTimeout(shutdownTimeout);
          process.exit(1);
        }
      };
      
      // Обработка различных сигналов
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Для nodemon
    });

    return server;
  } catch (error) {
    logger.error('Критическая ошибка запуска сервера', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Запуск сервера
startServer()
  .then(() => {
    logger.info('✅ UniFarm сервер успешно запущен');
  })
  .catch((error) => {
    logger.error('❌ Критическая ошибка запуска сервера', { error: error.message });
    process.exit(1);
  });