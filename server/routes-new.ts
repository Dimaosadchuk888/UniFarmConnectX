/**
 * Новые маршруты API, использующие новую архитектуру:
 * контроллер -> сервис -> хранилище
 * 
 * Этот файл содержит некоторые из маршрутов, которые были
 * переписаны на новую архитектуру. После тестирования и
 * полного перехода, все эти маршруты будут перенесены в
 * основной файл routes.ts
 */

import express, { Express, Request, Response, NextFunction, RequestHandler } from "express";

// Явно импортируем контроллеры для новых маршрутов API
import { SessionController } from './controllers/sessionController';
import { UserController } from './controllers/userController';
import { getDbEventManager } from './utils/db-events';
import { statusPageHandler } from './utils/status-page';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionControllerConsolidated';
import { ReferralController } from './controllers/referralControllerConsolidated';
import { BoostController } from './controllers/boostControllerConsolidated';
import { TonBoostController } from './controllers/tonBoostControllerConsolidated';
import { WalletController } from './controllers/walletControllerConsolidated';
import { DailyBonusController } from './controllers/dailyBonusControllerConsolidated';
import { UniFarmingController } from './controllers/UniFarmingController';

// Импортируем маршруты для Telegram бота
import telegramRouter from './telegram/routes';
import { telegramBot } from './telegram/bot';
import { isTelegramBotInitialized } from './telegram/globalState';
import logger from './utils/logger';
import { createSafeHandler, createRouteSafely } from './utils/express-helpers';

// Імпортуємо адміністративні маршрути
import adminRouter from './api/admin/index';

// Импортируем middleware для аутентификации администраторов
import { requireAdminAuth, logAdminAction } from './middleware/adminAuth';

// Импортируем маршрут для страницы статуса
import statusRouter from './routes/status';

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  logger.info('[NewRoutes] Регистрация новых маршрутов API');

  // Инициализируем Telegram бота
  try {
    telegramBot.initialize()
      .then((initialized) => {
        if (initialized) {
          logger.info('[Telegram] Бот успешно инициализирован');
        } else {
          logger.error('[Telegram] Не удалось инициализировать бота');
        }
      })
      .catch((error) => {
        logger.error('[Telegram] Ошибка при инициализации бота:', error);
      });
  } catch (error) {
    logger.error('[Telegram] Ошибка при инициализации бота:', error);
  }

  // Регистрируем маршруты для Telegram бота
  app.use('/api/telegram', telegramRouter);
  logger.info('[NewRoutes] Маршруты для Telegram бота зарегистрированы');
  
  // Регистрируем администативные маршруты
  app.use('/api/admin', adminRouter);
  logger.info('[NewRoutes] Административные маршруты зарегистрированы');

  // Endpoint для перевірки здоров'я сервера (health check)
  const healthCheckHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    // Перевіряємо стан бази даних
    let dbStatus: 'unknown' | 'connected' | 'error' | 'memory_fallback' | 'configured' | 'disconnected' = 'unknown';
    let dbDetails: Record<string, any> = {};
    
    try {
      // Получаем информацию о текущем подключении через глобальный объект
      // Используем app.locals.db для доступа к соединению
      const connectionManager = app.locals.db ? app.locals.db.connectionManager : null;
      const connectionInfo = connectionManager ? connectionManager.getCurrentConnectionInfo() : { 
        isConnected: false, 
        connectionName: null, 
        isMemoryMode: false 
      };
      
      // Проста перевірка підключення до БД
      const db = app.locals.storage;
      
      if (connectionInfo.isMemoryMode) {
        dbStatus = 'memory_fallback';
        dbDetails = {
          provider: 'memory',
          reason: 'Database connection failed, using memory fallback',
          tables: Array.from(connectionManager['memoryStorage']?.keys() || [])
        };
      } else if (connectionInfo.isConnected && connectionInfo.connectionName) {
        // Дополнительная проверка работоспособности
        if (db && typeof db.executeRawQuery === 'function') {
          try {
            const startTime = Date.now();
            await db.executeRawQuery('SELECT 1');
            const queryTime = Date.now() - startTime;
            
            dbStatus = 'connected';
            dbDetails = {
              provider: connectionInfo.connectionName,
              responseTime: `${queryTime}ms`,
              poolStatus: 'active'
            };
          } catch (queryError) {
            dbStatus = 'error';
            dbDetails = {
              provider: connectionInfo.connectionName,
              error: queryError instanceof Error ? queryError.message : String(queryError),
              poolStatus: 'failing'
            };
          }
        } else {
          dbStatus = 'configured';
          dbDetails = {
            provider: connectionInfo.connectionName,
            warning: 'DB configured but executeRawQuery not available'
          };
        }
      } else {
        dbStatus = 'disconnected';
        dbDetails = {
          error: 'No active database connection',
          memoryMode: connectionInfo.isMemoryMode
        };
      }
    } catch (error) {
      dbStatus = 'error';
      dbDetails = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('[HealthCheck] Database connection error:', error);
    }

    // Перевіряємо стан Telegram бота
    let telegramStatus = 'not_initialized';
    let telegramDetails = {};
    
    try {
      // Используем типобезопасную функцию для проверки инициализации бота
      if (isTelegramBotInitialized()) {
        telegramStatus = 'initialized';
        telegramDetails = {
          webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || 'not_set',
          miniAppUrl: process.env.MINI_APP_URL || 'not_set'
        };
      } else {
        telegramDetails = {
          reason: 'Bot not initialized or initialization failed',
          webhookConfigured: !!process.env.TELEGRAM_WEBHOOK_URL
        };
      }
    } catch (error) {
      telegramStatus = 'error';
      telegramDetails = {
        error: error instanceof Error ? error.message : String(error)
      };
      console.error('[HealthCheck] Telegram status check error:', error);
    }

    res.status(200).json({
      status: 'ok',
      server: 'up',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: {
        status: dbStatus,
        ...dbDetails,
        recentEvents: getDbEventManager().getHistory(5)
      },
      telegram: {
        status: telegramStatus,
        ...telegramDetails
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not_set',
        appUrl: process.env.APP_URL || 'not_set'
      },
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      }
    });
  };
  
  app.get('/api/health', healthCheckHandler);
  
  // Endpoint для управления подключением к базе данных (только для админов)
  app.post('/api/db/reconnect', requireAdminAuth, logAdminAction('DB_RECONNECT'), async (req, res) => {
    try {
      
      // Получаем текущую информацию о соединении
      const db = app.locals.db;
      const connectionInfo = db && typeof db.connectionManager?.getCurrentConnectionInfo === 'function' 
        ? db.connectionManager.getCurrentConnectionInfo()
        : { isConnected: false, connectionName: null, isMemoryMode: false };
      
      // Получаем историю недавних событий DB для включения в ответ
      const recentDbEvents = getDbEventManager().getHistory(10);
      
      // Попытка сбросить соединение и переподключиться
      let reconnectResult = false;
      let errorMessage = '';
      
      try {
        if (db && typeof db.connectionManager?.resetConnection === 'function') {
          // Попытка переподключения
          logger.info('[DB Manager] Attempting database reconnection...');
          reconnectResult = await db.connectionManager.resetConnection();
        } else {
          errorMessage = 'Database connection manager not available';
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[DB Manager] Reconnection error: ${errorMessage}`);
      }
      
      // Получаем обновленную информацию о соединении
      const newConnectionInfo = db && typeof db.connectionManager?.getCurrentConnectionInfo === 'function'
        ? db.connectionManager.getCurrentConnectionInfo()
        : { isConnected: false, connectionName: null, isMemoryMode: false };
      
      // Получаем новую историю событий после попытки переподключения
      const newDbEvents = getDbEventManager().getHistory(5);
      
      return res.json({
        success: true,
        reconnected: reconnectResult,
        previous: connectionInfo,
        current: newConnectionInfo,
        error: errorMessage || undefined,
        events: {
          before: recentDbEvents,
          after: newDbEvents,
          latest: getDbEventManager().getLastEvent()
        },
        diagnostics: {
          timeOfRequest: new Date().toISOString(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          uptime: process.uptime()
        }
      });
    } catch (error) {
      logger.error('[DB Manager] Error handling reconnection request:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint для получения информации о событиях DB (только для админов)
  app.get('/api/db/events', requireAdminAuth, logAdminAction('DB_EVENTS_VIEW'), async (req, res) => {
    try {
      
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const events = getDbEventManager().getHistory(limit);
      
      return res.json({
        success: true,
        events,
        count: events.length,
        latest: getDbEventManager().getLastEvent(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[DB Events] Error handling events request:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Используем маршрутизатор для страницы статуса
  app.use('/status', statusRouter);

  // Типы для обработчиков маршрутов
  type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;
  
  // Централизованный обработчик маршрутов с обработкой ошибок
  // Улучшенный тип для безопасного вызова обработчиков с надлежащей обработкой ошибок
  const safeHandler = (handler: any): RequestHandler => async (req, res, next) => {
    try {
      if (typeof handler === 'function') {
        // Явно вызываем функцию обработчика
        await handler(req, res, next);
        // Если обработчик не отправил ответ, не делаем ничего
        // Это позволяет обработчику управлять ответом самостоятельно
      } else {
        logger.error('[Routes] Обработчик не является функцией:', handler);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера: неверный обработчик'
          });
        }
      }
    } catch (error) {
      logger.error('[Routes] Ошибка в обработчике маршрута:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера',
          message: error instanceof Error ? error.message : String(error)
        });
      } else {
        next(error);
      }
    }
  };

  // Маршруты для сессий
  if (typeof SessionController.restoreSession === 'function') {
    app.post('/api/v2/session/restore', safeHandler(SessionController.restoreSession));
  }
  
  // Маршруты для пользователей
  if (typeof UserController.getUserById === 'function') {
    app.get('/api/v2/users/:id', safeHandler(UserController.getUserById));
  }
  
  // Маршруты для транзакций
  if (typeof TransactionController.getUserTransactions === 'function') {
    app.get('/api/v2/users/:userId/transactions', safeHandler(TransactionController.getUserTransactions));
  }
  
  // Маршруты для заданий с использованием консолидированного контроллера
  if (MissionController) {
    if (typeof MissionController.getActiveMissions === 'function') {
      app.get('/api/v2/missions/active', safeHandler(MissionController.getActiveMissions));
    }
    
    if (typeof MissionController.getUserCompletedMissions === 'function') {
      app.get('/api/v2/user-missions', safeHandler(MissionController.getUserCompletedMissions));
    }
    
    if (typeof MissionController.getMissionsWithCompletion === 'function') {
      app.get('/api/v2/missions/with-completion', safeHandler(MissionController.getMissionsWithCompletion));
    }
    
    if (typeof MissionController.checkMissionCompletion === 'function') {
      app.get('/api/v2/missions/check/:userId/:missionId', safeHandler(MissionController.checkMissionCompletion));
    }
    
    if (typeof MissionController.completeMission === 'function') {
      app.post('/api/v2/missions/complete', safeHandler(MissionController.completeMission));
    }
  }
  
  // Маршруты для реферальной системы с использованием консолидированного контроллера
  if (ReferralController) {
    // Генерация реферального кода (GET для получения существующего)
    if (typeof ReferralController.generateReferralCode === 'function') {
      app.get('/api/v2/referral/code', safeHandler(ReferralController.generateReferralCode.bind(ReferralController)));
      // POST для генерации нового кода (согласно ТЗ)
      app.post('/api/v2/referral/generate-code', safeHandler(ReferralController.generateReferralCode.bind(ReferralController)));
    }
    
    // Получение дерева рефералов
    if (typeof ReferralController.getReferralTree === 'function') {
      app.get('/api/v2/referral/tree', safeHandler(ReferralController.getReferralTree.bind(ReferralController)));
      app.get('/api/v2/referrals/tree', safeHandler(ReferralController.getReferralTree.bind(ReferralController)));
    }
    
    // Статистика рефералов (согласно ТЗ)
    if (typeof ReferralController.getReferralStats === 'function') {
      app.get('/api/v2/referral/stats', safeHandler(ReferralController.getReferralStats.bind(ReferralController)));
      app.get('/api/v2/referrals/stats', safeHandler(ReferralController.getReferralStats.bind(ReferralController)));
    }
    
    // Применение реферального кода
    if (ReferralController && 'applyReferralCode' in ReferralController && 
        typeof (ReferralController as any).applyReferralCode === 'function') {
      app.post('/api/v2/referrals/apply', safeHandler((ReferralController as any).applyReferralCode.bind(ReferralController)));
    }
  }
  
  // Маршруты для бонусов с использованием консолидированного контроллера
  if (DailyBonusController) {
    if (typeof DailyBonusController.getDailyBonusStatus === 'function') {
      app.get('/api/v2/daily-bonus/status', safeHandler(DailyBonusController.getDailyBonusStatus));
    }
    
    if (typeof DailyBonusController.claimDailyBonus === 'function') {
      app.post('/api/v2/daily-bonus/claim', safeHandler(DailyBonusController.claimDailyBonus));
    }
    
    if (typeof DailyBonusController.getStreakInfo === 'function') {
      app.get('/api/v2/daily-bonus/streak-info', safeHandler(DailyBonusController.getStreakInfo));
    }
  }
  
  // Маршруты для кошелька с использованием консолидированного контроллера
  if (WalletController) {
    if (typeof WalletController.getWalletBalance === 'function') {
      app.get('/api/v2/wallet/balance', safeHandler(WalletController.getWalletBalance.bind(WalletController)));
    }
    
    if (typeof WalletController.connectWallet === 'function') {
      app.post('/api/v2/wallet/connect', safeHandler(WalletController.connectWallet.bind(WalletController)));
    }
    
    if (typeof WalletController.disconnectWallet === 'function') {
      app.post('/api/v2/wallet/disconnect', safeHandler(WalletController.disconnectWallet.bind(WalletController)));
    }
    
    if (typeof WalletController.getTransactions === 'function') {
      app.get('/api/v2/wallet/transactions', safeHandler(WalletController.getTransactions.bind(WalletController)));
    }
    
    if (typeof WalletController.withdrawUni === 'function') {
      app.post('/api/v2/wallet/withdraw', safeHandler(WalletController.withdrawUni.bind(WalletController)));
    }
  }
  
  // Маршруты для TON бустов с использованием консолидированного контроллера
  if (TonBoostController) {
    if (typeof TonBoostController.getTonBoostPackages === 'function') {
      app.get('/api/v2/ton-farming/boosts', safeHandler(TonBoostController.getTonBoostPackages));
    }
    
    if (typeof TonBoostController.getUserTonBoosts === 'function') {
      app.get('/api/v2/ton-farming/active', safeHandler(TonBoostController.getUserTonBoosts));
    }
    
    if (typeof TonBoostController.purchaseTonBoost === 'function') {
      app.post('/api/v2/ton-farming/purchase', safeHandler(TonBoostController.purchaseTonBoost));
    }
    
    if (typeof TonBoostController.confirmExternalPayment === 'function') {
      app.post('/api/v2/ton-farming/confirm-payment', safeHandler(TonBoostController.confirmExternalPayment));
    }
    
    if (typeof TonBoostController.getUserTonFarmingInfo === 'function') {
      app.get('/api/v2/ton-farming/info', safeHandler(TonBoostController.getUserTonFarmingInfo));
    }
    
    if (typeof TonBoostController.calculateAndUpdateTonFarming === 'function') {
      app.post('/api/v2/ton-farming/update', safeHandler(TonBoostController.calculateAndUpdateTonFarming));
    }
  }
  
  // Маршруты для обычных бустов с использованием консолидированного контроллера
  if (BoostController) {
    if (typeof BoostController.getBoostPackages === 'function') {
      app.get('/api/v2/boosts', safeHandler(BoostController.getBoostPackages));
    }
    
    if (typeof BoostController.getUserActiveBoosts === 'function') {
      app.get('/api/v2/boosts/active', safeHandler(BoostController.getUserActiveBoosts));
    }
    
    if (typeof BoostController.purchaseBoost === 'function') {
      app.post('/api/v2/boosts/purchase', safeHandler(BoostController.purchaseBoost));
    }
  }
  
  // === UNI FARMING МАРШРУТЫ ===
  // Маршруты для UNI фарминга (v1 и v2 совместимость)
  if (UniFarmingController) {
    if (typeof UniFarmingController.getStatus === 'function') {
      // v1 маршрут для обратной совместимости
      app.get('/api/uni-farming/status', safeHandler(UniFarmingController.getStatus));
      // v2 маршрут
      app.get('/api/v2/uni-farming/status', safeHandler(UniFarmingController.getStatus));
      logger.info('[NewRoutes] ✓ UNI Farming маршруты зарегистрированы');
    }
  }
  
  logger.info('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}