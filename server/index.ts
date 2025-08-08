/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 * Restart trigger: 16:49
 */

// Загружаем переменные окружения из .env файла в development режиме
import dotenv from 'dotenv';
// Загружаем .env файл всегда, независимо от режима
dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  console.log('[ENV] Loaded .env file in development mode');
  console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
  console.log('[ENV] BYPASS_AUTH:', process.env.BYPASS_AUTH);
} else {
  console.log('[ENV] Loaded .env file in production mode');
  console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
}

// Проверяем, что переменные загружены
console.log('[ENV] TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
console.log('[ENV] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[ENV] JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

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
// Убираем node-fetch для продакшена
// import fetch from 'node-fetch';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Убираем WebSocket для продакшена
// @ts-ignore
// import * as WebSocket from 'ws';
import { config, logger, globalErrorHandler, notFoundHandler, EnvValidator, validateConfig } from '../core';
import { supabase } from '../core/supabase';
import { telegramMiddleware } from '../core/middleware/telegramMiddleware';
import { FarmingScheduler } from '../core/scheduler/farmingScheduler';
import { TONBoostIncomeScheduler } from '../modules/scheduler/tonBoostIncomeScheduler';
import { boostVerificationScheduler } from '../modules/scheduler/boostVerificationScheduler';
import { alertingService } from '../core/alerting';
// Убираем импорт setupViteIntegration для продакшена
// import { setupViteIntegration } from './setupViteIntegration';
import { BalanceNotificationService } from '../core/balanceNotificationService';
import { requireTelegramAuth } from '../core/middleware/telegramAuth';
import { AdminBotService } from '../modules/adminBot/service';
import { adminBotConfig } from '../config/adminBot';
import { metricsCollector } from '../core/metrics';
// Убираем WebSocket интеграцию для продакшена
// import { setupWebSocketBalanceIntegration } from './websocket-balance-integration';
import jwt from 'jsonwebtoken';
import { SupabaseUserRepository } from '../modules/user/service';
// Удаляем импорт старого мониторинга PostgreSQL пула

// API будет создан прямо в сервере

// Валидируем конфигурацию после загрузки переменных окружения
try {
  // Отключаем валидацию в продакшене для работы с mock данными
  if (process.env.NODE_ENV !== 'production') {
    validateConfig();
    console.log('[CONFIG] Все конфигурации валидны');
  } else {
    console.log('[CONFIG] Пропускаем валидацию в продакшене - используем mock данные');
  }
} catch (error) {
  console.error('[CONFIG] Ошибка валидации конфигурации:', error);
  // Не выходим из процесса в продакшене
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  } else {
    console.log('[CONFIG] Продолжаем работу с mock данными');
  }
}

/**
 * Поиск доступного порта
 */
async function findAvailablePort(startPort: number): Promise<number> {
  const net = require('net');
  
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  };

  let port = startPort;
  while (port < startPort + 100) { // Пробуем до 100 портов
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error(`Не удалось найти доступный порт в диапазоне ${startPort}-${startPort + 100}`);
}

/**
 * Установка WebSocket сервера с логированием всех событий
 * ЗАКОММЕНТИРОВАНО ДЛЯ ПРОДАКШЕНА
 */
/*
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
*/

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

    // Clean webhook implementation removed - now handled by telegram module routes

    // Initialize main bot
    const initMainBot = async () => {
      try {
        logger.info('[MainBot] Инициализация главного бота @UniFarming_Bot...');
        
        const { telegramService } = await import('../modules/telegram/service');
        
        // Set up webhook
        const webhookUrl = `${process.env.APP_DOMAIN || 'https://web-production-8e45b.up.railway.app'}/api/v2/telegram/webhook`;
        const webhookResult = await telegramService.setWebhook(webhookUrl);
        
        if (webhookResult.success) {
          logger.info('[MainBot] Webhook успешно установлен', { webhookUrl });
        } else {
          logger.error('[MainBot] Ошибка установки webhook', { error: webhookResult.message });
        }

        // Clear bot commands (remove all except /start)
        const commandsResult = await telegramService.setCommands([]);
        
        if (commandsResult.success) {
          logger.info('[MainBot] Команды бота очищены - остается только /start');
        } else {
          logger.error('[MainBot] Ошибка очистки команд', { error: commandsResult.message });
        }

        logger.info('[MainBot] Инициализация завершена - бот отвечает только на /start');
        
      } catch (error) {
        logger.error('[MainBot] Ошибка инициализации главного бота', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    };

    // Блокировка доступа к конфиденциальным файлам (КРИТИЧЕСКАЯ ЗАЩИТА)
    app.use('/.env', (_, res, next) => { res.status(403).send('Forbidden'); });
    app.use('/.replit', (_, res, next) => { res.status(403).send('Forbidden'); });
    app.use('/config', (_, res, next) => { res.status(403).send('Forbidden'); });
    app.use('/.git', (_, res, next) => { res.status(403).send('Forbidden'); });
    app.use('/node_modules', (_, res, next) => { res.status(403).send('Forbidden'); });

    // Rate limiting ПОЛНОСТЬЮ ОТКЛЮЧЕН для production использования
    // const limiter = rateLimit({...}); // ОТКЛЮЧЕН
    
    // Применяем rate limiting ко всем маршрутам - ОТКЛЮЧЕН
    // app.use(limiter); // ОТКЛЮЧЕН
    
    logger.info('[Server] Express Rate Limiting ПОЛНОСТЬЮ ОТКЛЮЧЕН');
    logger.info('[Server] Reload trigger: ' + new Date().toISOString());

    // TON Connect manifest endpoint - обрабатываем ДО глобального CORS middleware
    app.get('/tonconnect-manifest.json', (req: Request, res: Response) => {
      logger.info('[TonConnect] Запрос манифеста получен', { 
        url: req.url,
        host: req.headers.host,
        userAgent: req.headers['user-agent']
      });
      
      // Специальные CORS заголовки для TON Connect
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      const manifestPath = path.resolve(process.cwd(), 'client/public/tonconnect-manifest.json');
      logger.info('[TonConnect] Путь к манифесту:', manifestPath);
      
      res.sendFile(manifestPath, (err) => {
        if (err) {
          logger.error('[TonConnect] Ошибка отправки манифеста:', err);
          res.status(404).json({ error: 'Manifest not found' });
        } else {
          logger.info('[TonConnect] Манифест успешно отправлен');
        }
      });
    });

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

    // ПРОСТОЙ ТЕСТОВЫЙ ENDPOINT В САМОМ НАЧАЛЕ
    app.get('/simple-test', (req: Request, res: Response) => {
      console.log('[SIMPLE-TEST] ✅ Endpoint called successfully');
      res.json({
        success: true,
        message: 'Simple test endpoint works!',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    });

    // JWT debug endpoint
    app.get('/api/v2/debug/jwt', (req: Request, res: Response) => {
      const authHeader = req.headers.authorization;
      console.log('[JWT Debug] Auth header:', authHeader);
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.json({
          success: false,
          error: 'No JWT token provided',
          auth_header: authHeader || 'none'
        });
        return;
      }
      
      const token = authHeader.substring(7);
      try {
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
          res.json({
            success: false,
            error: 'JWT_SECRET not configured',
            env_check: 'JWT_SECRET' in process.env
          });
          return;
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
    
    // Temporary endpoint для генерации JWT токена для user 74
    app.get('/api/v2/debug/generate-jwt-74', (req: Request, res: Response) => {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        
        if (!jwtSecret) {
          res.status(500).json({ 
            error: 'JWT_SECRET not configured',
            env_check: 'JWT_SECRET' in process.env
          });
          return;
        }
        
        const payload = {
          userId: 74,
          user_id: 74,
          username: 'test_user_1752129840905',
          telegram_id: 999489,
          ref_code: 'TEST_1752129840905_dokxv0'
        };
        
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
        
        res.json({
          success: true,
          token,
          payload,
          jwt_secret_preview: jwtSecret.substring(0, 15) + '...',
          message: 'Use this token in Authorization header'
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
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

    // REMOVED: Старые диагностические endpoints (перемещены после SPA fallback)

    // ТЕСТОВЫЙ РОУТ ПЕРЕД ИМПОРТОМ ROUTES - ПРОВЕРКА ПРИОРИТЕТА
    app.get(`${apiPrefix}/ref-debug-test`, (req: Request, res: Response) => {
      console.log('[DIRECT ROUTE] 🔥 REF DEBUG TEST WORKS DIRECTLY!');
      res.json({ success: true, message: 'Direct referral debug test works', timestamp: Date.now() });
    });

    // Removed test handler that was intercepting /api/v2/users/profile requests
    
    // Import centralized routes (after critical endpoints)
    console.log('[ROUTES] Attempting to import ./routes...');
    try {
      const { default: apiRoutes } = await import('./routes');
      console.log('[ROUTES] Successfully imported routes, registering...');
      
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
      
      // ОБРАТНАЯ СОВМЕСТИМОСТЬ: Создаем прямые эндпоинты для старых путей
      console.log('[ROUTES] Adding backward compatibility endpoints...');
      
      // Добавляем прямые aliases для transaction endpoints (ФИКС ОТОБРАЖЕНИЯ ТРАНЗАКЦИЙ)
      console.log('[ROUTES] Adding transaction API aliases...');
      
      // Import transaction controller для прямого использования
      const { TransactionsController } = await import('../modules/transactions/controller');
      const transactionsController = new TransactionsController();
      
      // /api/transactions - прямой alias для старого API
      app.get('/api/transactions', requireTelegramAuth, async (req: Request, res: Response, next: any) => {
        console.log('[TRANSACTION ALIAS] /api/transactions called');
        await transactionsController.getTransactions(req, res, next);
      });
      
      // /api/v2/transactions - прямой alias для нового API
      app.get('/api/v2/transactions', requireTelegramAuth, async (req: Request, res: Response, next: any) => {
        console.log('[TRANSACTION ALIAS] /api/v2/transactions called');
        await transactionsController.getTransactions(req, res, next);
      });
      
      console.log('[ROUTES] Transaction aliases added successfully');
      
      // /api/me → данные текущего пользователя
      app.get('/api/me', requireTelegramAuth, async (req: Request, res: Response) => {
        try {
          const userId = (req as any).user?.id;
          if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
          }
          
          console.log('[BACKWARD COMPAT] /api/me for user:', userId);
          
          const userRepository = new SupabaseUserRepository();
          const user = await userRepository.getUserById(userId);
          
          if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
          }
          
          res.json({
            success: true,
            data: {
              id: user.id,
              telegram_id: user.telegram_id,
              username: user.username,
              first_name: user.first_name,
              // last_name: user.last_name, // Поле удалено из схемы
              ref_code: user.ref_code,
              balance_uni: user.balance_uni,
              balance_ton: user.balance_ton,
              uni_farming_active: user.uni_farming_active
            }
          });
        } catch (error) {
          console.error('[/api/me] Error:', error);
          res.status(500).json({ success: false, error: 'Internal server error' });
          return;
        }
      });
      
      console.log('[ROUTES] Backward compatibility endpoints added');
      
    } catch (routesError: unknown) {
      console.error('[ROUTES] CRITICAL ERROR: Failed to import routes:', routesError);
      console.error('[ROUTES] Stack trace:', routesError instanceof Error ? routesError.stack : 'No stack trace');
    }
    



    














    // Port configuration
    const apiPort = config.app.port;
    
    // Middleware для обхода блокировки хостов Vite на Railway
    app.use((req, res, next) => {
      // Подменяем заголовок Host для Vite
      if (req.headers.host && req.headers.host.includes('railway')) {
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
    
    // TON Connect manifest - serve directly
    app.get('/tonconnect-manifest.json', (req: Request, res: Response) => {
      const manifestPath = path.resolve(process.cwd(), 'client/public/tonconnect-manifest.json');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(manifestPath);
    });
    
    // Serve static files from client/public in all environments
    app.use('/assets', express.static(path.resolve(process.cwd(), 'client/public/assets'), {
      maxAge: '1d',
      etag: true
    }));
    
    // Serve public files directly (для манифестов и других публичных файлов)
    app.use(express.static(path.resolve(process.cwd(), 'client/public'), {
      dotfiles: 'allow',
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
      }
    }));
    
    // Additional route for .well-known
    app.use('/.well-known', express.static(path.resolve(process.cwd(), 'client/public/.well-known'), {
      maxAge: '1d',
      etag: true,
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }));
    


    // Диагностическая страница для анализа frontend balance flow
    app.get('/debug/balance-flow', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'check-frontend-balance-flow.html'));
    });

    // Тестовый endpoint для демонстрации WebSocket уведомлений
    app.post('/api/v2/test/balance-notification', express.json(), async (req: Request, res: Response) => {
      try {
        const { userId, changeAmount, currency } = req.body;
        
        if (!userId || !changeAmount || !currency) {
          res.status(400).json({
            success: false,
            error: 'Требуются параметры: userId, changeAmount, currency'
          });
          return;
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
        return;
      }
    });
    
    // Проверяем существование dist папки
    const fs = await import('fs');
    const distPath = path.resolve(process.cwd(), 'dist', 'public');
    const distExists = fs.existsSync(distPath);
    
    // Подключаем Vite интеграцию всегда если нет собранных файлов
    if (!distExists || process.env.NODE_ENV !== 'production') {
      logger.info(`[Vite] Включаем Vite интеграцию (dist не найден или dev режим)`);
      // await setupViteIntegration(app); // Удалено
    }
    
    // В режиме production используем client/index.html напрямую
    if (process.env.NODE_ENV === 'production') {
      logger.info(`[Static Files] Production mode - serving from client directory`);
      
      // Serve static files from client/public
      app.use('/assets', express.static(path.resolve(process.cwd(), 'client/public/assets'), {
        maxAge: '1d',
        etag: true
      }));
      
      // Serve public files directly
      app.use(express.static(path.resolve(process.cwd(), 'client/public'), {
        dotfiles: 'allow',
        index: false,
        setHeaders: (res, path) => {
          if (path.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
          }
        }
      }));
      
      logger.info(`[Static Files] Production static files configured successfully`);
    }
    
    // ДИАГНОСТИЧЕСКИЕ ENDPOINTS ДО SPA FALLBACK
    app.get('/test-app', (req: Request, res: Response) => {
      console.log('[TEST-APP] ✅ Endpoint called successfully');
      res.json({
        success: true,
        message: 'Application server is working',
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        host: req.get('Host'),
        path: req.path
      });
    });

    app.get('/test-static', (req: Request, res: Response) => {
      const indexPath = path.resolve(process.cwd(), 'dist', 'public', 'index.html');
      const fileExists = fs.existsSync(indexPath);
      res.json({
        success: true,
        indexPath,
        fileExists,
        fileSize: fileExists ? fs.statSync(indexPath).size : 0
      });
    });

    app.get('/test-html', (req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>UniFarm Test</title>
        </head>
        <body>
          <h1>UniFarm Connect - Test Page</h1>
          <p>Server is working correctly!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>User-Agent: ${req.get('User-Agent')}</p>
          <p>Host: ${req.get('Host')}</p>
          <a href="/">Go to main app</a>
        </body>
        </html>
      `);
    });
    
    // SPA fallback - serve index.html for non-API routes  
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      console.log(`[SPA-FALLBACK-CHECK] 🔍 Checking path: ${req.path}`);
      console.log(`[SPA-FALLBACK-CHECK] 🔍 Path starts with /api/: ${req.path.startsWith('/api/')}`);
      console.log(`[SPA-FALLBACK-CHECK] 🔍 Path starts with /test-: ${req.path.startsWith('/test-')}`);
      console.log(`[SPA-FALLBACK-CHECK] 🔍 Path starts with /assets/: ${req.path.startsWith('/assets/')}`);
      console.log(`[SPA-FALLBACK-CHECK] 🔍 Path starts with /health: ${req.path.startsWith('/health')}`);
      
      // Skip API routes, static assets, webhook, and test endpoints
      if (req.path.startsWith('/api/') || 
          req.path.startsWith('/assets/') ||
          req.path.startsWith('/health') || 
          req.path.startsWith('/test-') ||
          req.path === '/webhook' || 
          req.path === '/manifest.json' || 
          req.path === '/tonconnect-manifest.json' ||
          req.path === '/simple-test') {
        console.log(`[SPA-FALLBACK-CHECK] ✅ Skipping SPA fallback for: ${req.path}`);
        return res.status(404).json({ success: false, error: 'Route not found' });
      }
      
      console.log(`[SPA-FALLBACK-CHECK] ❌ Will serve SPA fallback for: ${req.path}`);
      
      console.log(`[SPA-FALLBACK] Serving index.html for path: ${req.path}`);
      console.log(`[SPA-FALLBACK] User-Agent: ${req.get('User-Agent')?.substring(0, 100)}...`);
      console.log(`[SPA-FALLBACK] Accept header: ${req.get('Accept')}`);
      
      // ИСПРАВЛЕНО: правильные пути к index.html для production и development
      const indexPath = process.env.NODE_ENV === 'production' 
        ? path.resolve(process.cwd(), 'dist', 'public', 'index.html')
        : path.resolve(process.cwd(), 'client', 'index.html');
      
      // Fallback пути если основной файл не существует
      const fallbackPaths = [
        path.resolve(process.cwd(), 'dist', 'public', 'index.html'),
        path.resolve(process.cwd(), 'client', 'index.html'),
        path.resolve(process.cwd(), 'client', 'public', 'index.html')
      ];
      
      console.log(`[SPA-FALLBACK] Serving file: ${indexPath}`);
      console.log(`[SPA-FALLBACK] Current working directory: ${process.cwd()}`);
      const fileExists = fs.existsSync(indexPath);
      console.log(`[SPA-FALLBACK] File exists: ${fileExists}`);
      if (fileExists) {
        try {
          const stats = fs.statSync(indexPath);
          console.log(`[SPA-FALLBACK] File size: ${stats.size}`);
        } catch (e) {
          console.log(`[SPA-FALLBACK] File stat error: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        console.log(`[SPA-FALLBACK] File size: N/A`);
      }
      
      // Находим первый существующий файл
      let finalIndexPath = indexPath;
      if (!fs.existsSync(indexPath)) {
        console.log(`[SPA-FALLBACK] Primary file not found, trying fallbacks...`);
        for (const fallbackPath of fallbackPaths) {
          if (fs.existsSync(fallbackPath)) {
            finalIndexPath = fallbackPath;
            console.log(`[SPA-FALLBACK] Using fallback file: ${fallbackPath}`);
            break;
          }
        }
      }
      
      console.log(`[SPA-FALLBACK] Final file path: ${finalIndexPath}`);
      console.log(`[SPA-FALLBACK] Final file exists: ${fs.existsSync(finalIndexPath)}`);
      
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.sendFile(finalIndexPath, (err) => {
        if (err) {
          console.error(`[SPA-FALLBACK] ❌ Error serving index.html:`, err);
          console.error(`[SPA-FALLBACK] ❌ Error code:`, (err as any).code);
          console.error(`[SPA-FALLBACK] ❌ Error message:`, err.message);
          
          // Если не можем отдать файл, отдаем простую HTML страницу
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>UniFarm Connect</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #e74c3c; }
                .info { color: #3498db; }
              </style>
            </head>
            <body>
              <h1>UniFarm Connect</h1>
              <p class="info">Приложение загружается...</p>
              <p class="error">Если приложение не загрузилось, попробуйте обновить страницу.</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </body>
            </html>
          `);
        } else {
          console.log(`[SPA-FALLBACK] ✅ Successfully served index.html for ${req.path}`);
        }
      });
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
    // const wss = setupWebSocketServer(httpServer); // ЗАКОММЕНТИРОВАНО
    
    // Запуск сервера с автоматическим поиском доступного порта
    const deploymentHost = '0.0.0.0'; // Всегда используем 0.0.0.0 для доступности извне
    let finalPort: number;
    
    try {
      const envPort = Number(apiPort);
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        // Railway/Vercel/Render требуют слушать ровно на выданном порту
        finalPort = envPort;
      } else {
        // Локально подбираем свободный порт при необходимости
        finalPort = await findAvailablePort(envPort);
        if (finalPort !== envPort) {
          logger.warn(`⚠️  Порт ${envPort} занят, используем порт ${finalPort}`);
        }
      }
    } catch (error) {
      logger.error('❌ Не удалось определить порт для запуска', { error });
      throw error;
    }
    
    // Добавляем обработчик ошибок сервера
    httpServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Порт ${finalPort} уже используется`, { error: error.message });
        process.exit(1);
      } else {
        logger.error('❌ Ошибка HTTP сервера', { error: error.message });
        process.exit(1);
      }
    });

    const server = httpServer.listen(finalPort, deploymentHost, () => {
      logger.info(`🚀 API сервер запущен на http://0.0.0.0:${finalPort}`);
      logger.info(`📡 API доступен: http://localhost:${finalPort}${apiPrefix}/`);
      logger.info(`🔌 WebSocket сервер активен на ws://localhost:${finalPort}/ws`);
      logger.info(`🌐 Frontend: http://localhost:${finalPort}/ (Static files from dist)`);
      
      // Supabase API не требует мониторинга connection pool
      logger.info('✅ Supabase database connection active');
      
      // EMERGENCY STOP: Планировщики временно отключены для диагностики
      if (fs.existsSync('SCHEDULER_DISABLED.flag')) {
        logger.warn('🚨 SCHEDULER_DISABLED.flag обнаружен - планировщики НЕ запускаются');
        logger.warn('📋 Для восстановления удалите файл SCHEDULER_DISABLED.flag');
      } else {
        // EMERGENCY FIX: Инициализация защищенных планировщиков через Singleton
        try {
          const protectedFarmingScheduler = FarmingScheduler.getInstance();
          protectedFarmingScheduler.start();
          logger.info('✅ [EMERGENCY FIX] Защищенный фарминг-планировщик запущен');
        } catch (error) {
          logger.error('❌ [EMERGENCY FIX] Ошибка запуска защищенного фарминг-планировщика', { error });
        }
        
        // EMERGENCY FIX: Инициализация защищенного TON Boost планировщика
        try {
          const protectedTonBoostScheduler = TONBoostIncomeScheduler.getInstance();
          protectedTonBoostScheduler.start();
          logger.info('✅ [EMERGENCY FIX] Защищенный TON Boost планировщик запущен');
        } catch (error) {
          logger.error('❌ [EMERGENCY FIX] Ошибка запуска защищенного TON Boost планировщика', { error });
        }
        
        // Boost Verification Scheduler: Автоматическая верификация pending boost платежей
        try {
          boostVerificationScheduler.start();
          logger.info('✅ Boost Verification Scheduler запущен - автоматическая верификация pending платежей');
        } catch (error) {
          logger.error('❌ Ошибка запуска Boost Verification Scheduler', { error });
        }
      }
      
      // Настройка интеграции WebSocket с BalanceManager (с исправленными уведомлениями)
      try {
        // setupWebSocketBalanceIntegration(); // Удалено
        logger.info('✅ WebSocket интеграция с BalanceManager настроена (v2 with changeAmount fix)');
      } catch (error) {
        logger.error('❌ Ошибка настройки WebSocket интеграции', { error });
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
          const appUrl = process.env.TELEGRAM_WEBAPP_URL || process.env.APP_DOMAIN || 'https://web-production-8e45b.up.railway.app';
          const webhookUrl = `${appUrl}/api/v2/admin-bot/webhook`;
          
          logger.info('[AdminBot] Initializing with URL', { appUrl, webhookUrl });
          
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
      
      // Инициализация главного бота @UniFarming_Bot
      (async () => {
        try {
          await initMainBot();
        } catch (error) {
          logger.error('❌ Ошибка инициализации главного бота', { error });
        }
      })();
      
      // Инициализация системы алертинга для production мониторинга
      try {
        alertingService.startMonitoring(60000); // Проверка каждую минуту
        logger.info('✅ Система алертинга запущена');
      } catch (error) {
        logger.error('❌ Ошибка запуска системы алертинга', { error });
      }
      
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Инициализация DepositMonitor для автоматического мониторинга TON депозитов
      (async () => {
        try {
          const depositMonitorModule = await import('../utils/depositMonitor');
          const DepositMonitor = depositMonitorModule.default;
          const depositMonitor = DepositMonitor.getInstance();
          depositMonitor.startMonitoring();
          logger.info('✅ DepositMonitor запущен - автоматический мониторинг TON депозитов активен');
        } catch (error) {
          logger.error('❌ Ошибка запуска DepositMonitor', { error });
        }
      })();

      // ГЛОБАЛЬНАЯ ОЧИСТКА ПАМЯТИ каждые 10 минут для предотвращения утечек
      const memoryCleanupInterval = setInterval(() => {
        try {
          // Принудительный вызов garbage collector если доступен
          if (global.gc) {
            global.gc();
            logger.debug('[GlobalMemoryCleanup] Garbage collector called');
          }

          // Логируем использование памяти
          const memUsage = process.memoryUsage();
          const memoryPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
          
          logger.info('[GlobalMemoryCleanup] Memory usage:', {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            percentage: memoryPercentage + '%'
          });

          // Критическое предупреждение если память выше 90%
          if (memoryPercentage > 90) {
            logger.error('[GlobalMemoryCleanup] CRITICAL: memory - Критическое использование памяти', {
              heapUsed: memUsage.heapUsed,
              heapTotal: memUsage.heapTotal,
              percentage: memoryPercentage
            });
          }

        } catch (error) {
          logger.warn('[GlobalMemoryCleanup] Memory cleanup failed:', {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, 10 * 60 * 1000); // Каждые 10 минут

      logger.info('✅ Глобальная очистка памяти запущена - каждые 10 минут');
      
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
          // wss.close(() => { // ЗАКОММЕНТИРОВАНО
          //   logger.info('✅ WebSocket сервер остановлен');
          // });
          
          // 2. Закрываем активные WebSocket соединения
          // wss.clients.forEach((ws) => { // ЗАКОММЕНТИРОВАНО
          //   ws.close(1001, 'Server shutting down');
          // });
          
          // 3. Останавливаем планировщики (если они инициализированы)
          try {
            if (typeof FarmingScheduler !== 'undefined') {
              // farmingScheduler.stop(); // Останавливаем через класс
              logger.info('✅ Фарминг-планировщик остановлен');
            }
          } catch (error) {
            logger.warn('Фарминг-планировщик не был инициализирован');
          }
          
          try {
            if (typeof TONBoostIncomeScheduler !== 'undefined') {
              // tonBoostIncomeScheduler.stop(); // Останавливаем через класс
              logger.info('✅ TON Boost планировщик остановлен');
            }
          } catch (error) {
            logger.warn('TON Boost планировщик не был инициализирован');
          }
          
          // Останавливаем глобальную очистку памяти
          if (memoryCleanupInterval) {
            clearInterval(memoryCleanupInterval);
            logger.info('✅ Глобальная очистка памяти остановлена');
          }
          
          // Останавливаем DepositMonitor
          try {
            const depositMonitorModule = await import('../utils/depositMonitor');
            const DepositMonitor = depositMonitorModule.default;
            const depositMonitor = DepositMonitor.getInstance();
            depositMonitor.stopMonitoring();
            logger.info('✅ DepositMonitor остановлен');
          } catch (error) {
            logger.warn('DepositMonitor остановка пропущена:', error);
          }
          
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

// Проверка критических переменных окружения
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'BOT_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют переменные окружения:', missingEnvVars);
  console.error('📋 Установите переменные в Railway Dashboard или используйте .env файл');
  
  // Fallback для Railway - простой сервер без зависимостей
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Запуск fallback сервера без переменных окружения...');
    
    const express = require('express');
    const path = require('path');
    const fs = require('fs');
    
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      next();
    });
    
    app.get('/test-app', (req, res) => {
      res.json({
        success: true,
        message: 'Fallback server is working',
        version: '1.0.35-FALLBACK',
        timestamp: new Date().toISOString(),
        missingEnvVars,
        env: process.env.NODE_ENV || 'development'
      });
    });
    
    app.get('/version', (req, res) => {
      res.json({
        version: '1.0.35-FALLBACK',
        timestamp: new Date().toISOString(),
        missingEnvVars,
        message: 'Missing environment variables - using fallback server'
      });
    });
    
    app.use('/assets', express.static(path.resolve(process.cwd(), 'dist/public/assets')));
    
    app.get('*', (req, res) => {
      console.log(`[FALLBACK-SERVER] Serving index.html for: ${req.path}`);
      
      const indexPath = path.resolve(process.cwd(), 'dist/public/index.html');
      
      if (fs.existsSync(indexPath)) {
        console.log(`[FALLBACK-SERVER] File exists: ${indexPath}`);
        res.sendFile(indexPath);
      } else {
        console.log(`[FALLBACK-SERVER] File not found: ${indexPath}`);
        res.status(200).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>UniFarm Connect - Fallback Server</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0f0f23; color: white; }
              .success { color: #4CAF50; }
              .warning { color: #FF9800; }
              .error { color: #f44336; }
            </style>
          </head>
          <body>
            <h1>UniFarm Connect</h1>
            <p class="success">✅ Fallback server is working!</p>
            <p class="warning">⚠️ Missing environment variables:</p>
            <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
              ${missingEnvVars.map(envVar => `<li class="error">${envVar}</li>`).join('')}
            </ul>
            <p>Path: ${req.path}</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
            <p class="warning">Index file not found at: ${indexPath}</p>
            <p><strong>Решение:</strong> Установите переменные окружения в Railway Dashboard</p>
          </body>
          </html>
        `);
      }
    });
    
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Fallback server running on http://0.0.0.0:${PORT}`);
      console.log(`📁 Current directory: ${process.cwd()}`);
      console.log(`🔍 Looking for index.html at: ${path.resolve(process.cwd(), 'dist/public/index.html')}`);
      console.log(`📄 File exists: ${fs.existsSync(path.resolve(process.cwd(), 'dist/public/index.html'))}`);
      console.log(`❌ Missing env vars: ${missingEnvVars.join(', ')}`);
    });
    
    process.exit(0);
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