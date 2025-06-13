/**
 * Главная точка входа UniFarm
 * Запускает сервер с интеграцией всех модулей
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
// @ts-ignore
import * as WebSocket from 'ws';
import { config, logger, globalErrorHandler, notFoundHandler, EnvValidator } from '../core';
import { db } from '../core/db';
import { users, transactions, missions } from '../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { telegramMiddleware } from '../core/middleware/telegramMiddleware';
import { farmingScheduler } from '../core/scheduler/farmingScheduler';
import { startPoolMonitoring, logPoolStats } from '../core/dbPoolMonitor';

// API будет создан прямо в сервере

/**
 * Установка WebSocket сервера с логированием всех событий
 */
function setupWebSocketServer(httpServer: any) {
  // Инициализация WebSocket сервера
  const wss = new WebSocket.WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    perMessageDeflate: false
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

    // TELEGRAM WEBHOOK - МАКСИМАЛЬНЫЙ ПРИОРИТЕТ (первая регистрация)
    app.post('/webhook', express.json({ limit: '1mb' }), async (req: Request, res: Response) => {
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
                    web_app: { url: 'https://uni-farm-connect-x-osadchukdmitro2.replit.app' }
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
    });

    // Middleware
    app.use(cors({
      origin: config.security.cors.origin,
      credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Логирование запросов
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, duration);
      });
      next();
    });

    // Health check (должен быть первым для мониторинга)
    app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: config.app.apiVersion,
        environment: config.app.nodeEnv
      });
    });



    // API routes
    const apiPrefix = `/api/v2`;
    
    // Import centralized routes (after critical endpoints)
    const { default: apiRoutes } = await import('./routes');
    app.use(apiPrefix, apiRoutes);
    
    // Добавляем поддержку /api для обратной совместимости
    app.use('/api', apiRoutes);
    
    // Добавляем webhook на корневом уровне
    app.use('/', apiRoutes);
    
    // Apply optional Telegram middleware to all routes for init data parsing
    app.use(telegramMiddleware);
    



    














    // Port configuration
    const apiPort = config.app.port;
    
    // Static files and SPA routing
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Serve static files from dist/public
      app.use(express.static(path.join(process.cwd(), 'dist/public')));
      
      // SPA fallback - serve index.html for non-API routes
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Skip API routes and webhook
        if (req.path.startsWith('/api/') || req.path.startsWith('/health') || req.path === '/webhook') {
          return next();
        }
        
        // Fallback to index.html for SPA routing
        res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
      });
    } else {
      // Development mode - setup Vite dev server with WebSocket support
      const { setupVite } = await import('./vite-simple.js');
      
      // Создаем HTTP сервер для WebSocket интеграции в development режиме
      const httpServer = createServer(app);
      
      // Устанавливаем WebSocket сервер для development
      const wss = setupWebSocketServer(httpServer);
      
      // Start server first, then setup Vite
      const server = httpServer.listen(Number(apiPort), config.app.host, async () => {
        logger.info(`🚀 API сервер запущен на http://${config.app.host}:${apiPort}`);
        logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/ (Vite dev server)`);
        logger.info(`🔌 WebSocket сервер активен на ws://${config.app.host}:${apiPort}/ws`);
        
        // Setup Vite after server starts
        await setupVite(app, server);
      });
      return;
    }

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

    // Error handlers (must be last)
    app.use(notFoundHandler);
    app.use(globalErrorHandler);
    
    // Создаем HTTP сервер для WebSocket интеграции
    const httpServer = createServer(app);
    
    // Устанавливаем WebSocket сервер
    const wss = setupWebSocketServer(httpServer);
    
    // Запуск сервера
    const server = httpServer.listen(Number(apiPort), config.app.host, () => {
      logger.info(`🚀 API сервер запущен на http://${config.app.host}:${apiPort}`);
      logger.info(`📡 API доступен: http://${config.app.host}:${apiPort}${apiPrefix}/`);
      logger.info(`🔌 WebSocket сервер активен на ws://${config.app.host}:${apiPort}/ws`);
      if (process.env.NODE_ENV === 'production') {
        logger.info(`🌐 Frontend: http://${config.app.host}:${apiPort}/`);
      } else {
        logger.info(`🌐 Frontend: http://${config.app.host}:5173/ (Vite dev server)`);
      }
      
      // Инициализация мониторинга connection pool
      logger.info('🔍 Инициализация мониторинга connection pool...');
      logPoolStats(); // Первоначальный вывод статистики
      
      // Запуск автоматического мониторинга каждые 5 минут
      const poolMonitorInterval = startPoolMonitoring(5);
      logger.info('✅ Мониторинг connection pool активен (интервал: 5 минут)');
      
      // Инициализация фарминг-планировщика
      try {
        farmingScheduler.start();
        logger.info('✅ Фарминг-планировщик запущен');
      } catch (error) {
        logger.error('❌ Ошибка запуска фарминг-планировщика', { error });
      }
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('🔄 Получен сигнал SIGTERM, завершение работы...');
        if (poolMonitorInterval) {
          clearInterval(poolMonitorInterval);
          logger.info('🔍 Мониторинг connection pool остановлен');
        }
        farmingScheduler.stop();
        logger.info('✅ Фарминг-планировщик остановлен');
        server.close(() => {
          logger.info('✅ Сервер корректно завершен');
          process.exit(0);
        });
      });
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