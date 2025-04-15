import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Импортируем контроллеры
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionController';
import { FarmingController } from './controllers/farmingController';
import { ReferralController } from './controllers/referralController';

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