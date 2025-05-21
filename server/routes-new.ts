/**
 * Новые маршруты API, использующие новую архитектуру:
 * контроллер -> сервис -> хранилище
 * 
 * Этот файл содержит некоторые из маршрутов, которые были
 * переписаны на новую архитектуру. После тестирования и
 * полного перехода, все эти маршруты будут перенесены в
 * основной файл routes.ts
 */

import express, { Express, Request, Response } from "express";

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

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export function registerNewRoutes(app: Express): void {
  console.log('[NewRoutes] Регистрация новых маршрутов API');

  // Инициализируем Telegram бота
  try {
    telegramBot.initialize()
      .then((initialized) => {
        if (initialized) {
          logger.log('[Telegram] Бот успешно инициализирован');
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
  logger.log('[NewRoutes] Маршруты для Telegram бота зарегистрированы');

  // Маршруты для сессий
  app.post('/api/v2/session/restore', (req, res, next) => {
    if (SessionController.restoreSession) {
      return SessionController.restoreSession(req, res, next);
    } else {
      logger.error('[Routes] Метод restoreSession не найден в SessionController');
      return res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера: метод не реализован'
      });
    }
  });
  
  // Маршруты для пользователей
  app.get('/api/v2/users/:id', (req, res, next) => {
    if (UserController.getUserById) {
      return UserController.getUserById(req, res, next);
    } else {
      logger.error('[Routes] Метод getUserById не найден в UserController');
      return res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера: метод не реализован'
      });
    }
  });
  
  // Маршруты для транзакций
  app.get('/api/v2/users/:userId/transactions', (req, res, next) => {
    if (TransactionController.getUserTransactions) {
      return TransactionController.getUserTransactions(req, res, next);
    } else {
      logger.error('[Routes] Метод getUserTransactions не найден в TransactionController');
      return res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера: метод не реализован'
      });
    }
  });

  // Маршруты для заданий с использованием консолидированного контроллера
  app.get('/api/v2/missions/active', (req, res) => MissionController.getActiveMissions(req, res));
  app.get('/api/v2/user-missions', (req, res) => MissionController.getUserCompletedMissions(req, res));
  app.get('/api/v2/missions/with-completion', (req, res) => MissionController.getMissionsWithCompletion(req, res));
  app.get('/api/v2/missions/check/:userId/:missionId', (req, res) => MissionController.checkMissionCompletion(req, res));
  app.post('/api/v2/missions/complete', (req, res) => MissionController.completeMission(req, res));
  
  // Маршруты для реферальной системы с использованием консолидированного контроллера
  app.get('/api/v2/referrals/tree', (req, res) => ReferralController.getReferralTree(req, res));
  app.get('/api/v2/referrals/stats', (req, res) => ReferralController.getReferralStats(req, res));
  app.post('/api/v2/referrals/apply', (req, res) => ReferralController.applyReferralCode(req, res));
  
  // Маршруты для бонусов с использованием консолидированного контроллера
  app.get('/api/v2/daily-bonus/status', (req, res) => DailyBonusController.getDailyBonusStatus(req, res));
  app.post('/api/v2/daily-bonus/claim', (req, res) => DailyBonusController.claimDailyBonus(req, res));
  app.get('/api/v2/daily-bonus/streak-info', (req, res) => DailyBonusController.getStreakInfo(req, res));
  
  // Маршруты для кошелька с использованием консолидированного контроллера
  app.get('/api/v2/wallet/balance', (req, res) => WalletController.getWalletBalance(req, res));
  app.post('/api/v2/wallet/connect', (req, res) => WalletController.connectWallet(req, res));
  app.post('/api/v2/wallet/disconnect', (req, res) => WalletController.disconnectWallet(req, res));
  app.get('/api/v2/wallet/transactions', (req, res) => WalletController.getTransactions(req, res));
  app.post('/api/v2/wallet/withdraw', (req, res) => WalletController.withdrawUni(req, res));
  
  // Маршруты для TON бустов с использованием консолидированного контроллера
  app.get('/api/v2/ton-farming/boosts', (req, res) => TonBoostController.getTonBoostPackages(req, res));
  app.get('/api/v2/ton-farming/active', (req, res) => TonBoostController.getUserTonBoosts(req, res));
  app.post('/api/v2/ton-farming/purchase', (req, res) => TonBoostController.purchaseTonBoost(req, res));
  app.post('/api/v2/ton-farming/confirm-payment', (req, res) => TonBoostController.confirmExternalPayment(req, res));
  app.get('/api/v2/ton-farming/info', (req, res) => TonBoostController.getUserTonFarmingInfo(req, res));
  app.post('/api/v2/ton-farming/update', (req, res) => TonBoostController.calculateAndUpdateTonFarming(req, res));
  
  // Маршруты для обычных бустов с использованием консолидированного контроллера
  app.get('/api/v2/boosts', (req, res) => BoostController.getBoostPackages(req, res));
  app.get('/api/v2/boosts/active', (req, res) => BoostController.getUserActiveBoosts(req, res));
  app.post('/api/v2/boosts/purchase', (req, res) => BoostController.purchaseBoost(req, res));
  
  console.log('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');
}