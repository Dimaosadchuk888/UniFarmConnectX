import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Импортируем контроллеры
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionController';
import { FarmingController } from './controllers/farmingController';
import { ReferralController } from './controllers/referralController';
import { DailyBonusController } from './controllers/dailyBonusController';
import { UniFarmingController } from './controllers/uniFarmingController';
import { BoostController } from './controllers/boostController';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Простой маршрут для проверки API (для отладки)
  app.get("/api/test-json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ status: "ok", message: "API работает" }));
  });

  // Маршруты для пользователей
  app.get("/api/users/:id", UserController.getUserById);
  
  // Маршруты для транзакций
  app.get("/api/transactions", TransactionController.getUserTransactions);
  app.post("/api/withdraw", TransactionController.withdrawFunds);
  
  // Маршруты для миссий
  app.get("/api/missions/active", MissionController.getActiveMissions);
  app.get("/api/user_missions", MissionController.getUserCompletedMissions);
  app.post("/api/missions/complete", MissionController.completeMission);
  
  // Маршруты для фарминг-депозитов
  app.get("/api/farming-deposits", FarmingController.getUserFarmingDeposits);
  app.post("/api/deposit", FarmingController.createDeposit);
  
  // Маршруты для реферальной системы
  app.get("/api/referrals", ReferralController.getUserReferrals);
  app.get("/api/referrals/inviter/:id", ReferralController.getUserInviter);
  
  // Маршруты для ежедневного бонуса
  app.get("/api/daily-bonus/status", DailyBonusController.checkDailyBonusStatus);
  app.post("/api/daily-bonus/claim", DailyBonusController.claimDailyBonus);
  
  // Маршруты для UNI фарминга
  app.get("/api/uni-farming/info", UniFarmingController.getUserFarmingInfo);
  app.get("/api/uni-farming/update-balance", UniFarmingController.calculateAndUpdateFarming);
  app.post("/api/uni-farming/deposit", UniFarmingController.createUniFarmingDeposit);
  app.post("/api/uni-farming/harvest", UniFarmingController.harvestFarmingBalance);
  
  // Маршруты для буст-пакетов
  app.get("/api/boosts", BoostController.getBoostPackages);
  app.post("/api/boosts/purchase", BoostController.purchaseBoost);

  // Централизованная обработка ошибок
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error in API route:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}