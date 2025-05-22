/**
 * Новые маршруты API, использующие новую архитектуру:
 * контроллер -> сервис -> хранилище
 * 
 * Этот файл содержит некоторые из маршрутов, которые были
 * переписаны на новую архитектуру. После тестирования и
 * полного перехода, все эти маршруты будут перенесены в
 * основной файл routes.ts
 */

import express, { Express, Request, Response, NextFunction } from "express";

// Явно импортируем контроллеры для новых маршрутов API
import { SessionController } from './controllers/sessionController';
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionControllerConsolidated';
import { ReferralController } from './controllers/referralControllerConsolidated';
import { BoostController } from './controllers/boostControllerConsolidated';
import { TonBoostController } from './controllers/tonBoostControllerConsolidated';
import { WalletController } from './controllers/walletControllerConsolidated';
import { DailyBonusController } from './controllers/dailyBonusControllerConsolidated';

// Импортируем маршруты для Telegram бота
import telegramRouter from './telegram/routes';
import { telegramBot } from './telegram/bot';
import logger from './utils/logger';

// Імпортуємо адміністративні маршрути
import adminRouter from './api/admin/index';

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
  app.get('/api/health', async (req: Request, res: Response) => {
    // Перевіряємо стан бази даних
    let dbStatus = 'unknown';
    try {
      // Проста перевірка підключення до БД
      const db = app.locals.storage;
      if (db && typeof db.executeRawQuery === 'function') {
        await db.executeRawQuery('SELECT 1');
        dbStatus = 'connected';
      } else {
        dbStatus = 'configured';
      }
    } catch (error) {
      dbStatus = 'error';
      console.error('[HealthCheck] Database connection error:', error);
    }

    // Перевіряємо стан Telegram бота
    let telegramStatus = 'not_initialized';
    try {
      // @ts-ignore - using global variable set in server initialization
      if (global.telegramBotInitialized === true) {
        telegramStatus = 'initialized';
      }
    } catch (error) {
      console.error('[HealthCheck] Telegram status check error:', error);
    }

    res.status(200).json({
      status: 'ok',
      server: 'up',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db: dbStatus,
      telegram: telegramStatus,
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      }
    });
  });

  // Централизованный обработчик маршрутов с обработкой ошибок
  const safeHandler = (handler: Function) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (typeof handler === 'function') {
        return await handler(req, res, next);
      } else {
        logger.error('[Routes] Обработчик не является функцией:', handler);
        return res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера: неверный обработчик'
        });
      }
    } catch (error) {
      logger.error('[Routes] Ошибка в обработчике маршрута:', error);
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера',
          message: error instanceof Error ? error.message : String(error)
        });
      }
      
      next(error);
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
    if (typeof ReferralController.getReferralTree === 'function') {
      app.get('/api/v2/referrals/tree', safeHandler(ReferralController.getReferralTree));
    }
    
    if (typeof ReferralController.getReferralStats === 'function') {
      app.get('/api/v2/referrals/stats', safeHandler(ReferralController.getReferralStats));
    }
    
    if (typeof ReferralController.applyReferralCode === 'function') {
      app.post('/api/v2/referrals/apply', safeHandler(ReferralController.applyReferralCode));
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
      app.get('/api/v2/wallet/balance', safeHandler(WalletController.getWalletBalance));
    }
    
    if (typeof WalletController.connectWallet === 'function') {
      app.post('/api/v2/wallet/connect', safeHandler(WalletController.connectWallet));
    }
    
    if (typeof WalletController.disconnectWallet === 'function') {
      app.post('/api/v2/wallet/disconnect', safeHandler(WalletController.disconnectWallet));
    }
    
    if (typeof WalletController.getTransactions === 'function') {
      app.get('/api/v2/wallet/transactions', safeHandler(WalletController.getTransactions));
    }
    
    if (typeof WalletController.withdrawUni === 'function') {
      app.post('/api/v2/wallet/withdraw', safeHandler(WalletController.withdrawUni));
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
  
  logger.info('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}