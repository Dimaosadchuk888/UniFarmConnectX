import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';

// Расширяем тип WebSocket для поддержки пользовательских свойств
interface ExtendedWebSocket extends WebSocket {
  userId?: number;
}
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
import { TonBoostController } from './controllers/tonBoostController';
import { AuthController } from './controllers/authController';
import { WalletController } from './controllers/walletController';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Простой маршрут для проверки API (для отладки)
  app.get("/api/test-json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ status: "ok", message: "API работает" }));
  });

  // Маршруты для аутентификации
  app.post("/api/auth/telegram", AuthController.authenticateTelegram);
  
  // Маршруты для пользователей
  app.get("/api/users/:id", UserController.getUserById);
  app.get("/api/wallet/balance", UserController.getUserBalance);
  
  // Маршруты для работы с TON-кошельком
  app.post("/api/user/link-wallet", WalletController.linkWalletAddress);
  app.get("/api/user/wallet-address", WalletController.getUserWalletAddress);
  
  // Маршруты для транзакций
  app.get("/api/transactions", TransactionController.getUserTransactions);
  app.get("/api/transactions/:user_id", TransactionController.getUserTransactions);
  app.post("/api/withdraw", TransactionController.withdrawFunds);
  app.post("/api/transactions/create", TransactionController.createTransaction);
  
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
  app.get("/api/uni-farming/deposits", UniFarmingController.getUserFarmingDeposits);
  
  // Маршруты для буст-пакетов
  app.get("/api/boosts", BoostController.getBoostPackages);
  app.get("/api/boosts/active", BoostController.getUserActiveBoosts);
  app.post("/api/boosts/purchase", BoostController.purchaseBoost);
  
  // Маршруты для TON Boost-пакетов
  app.get("/api/ton-boosts", TonBoostController.getTonBoostPackages);
  app.get("/api/ton-boosts/active", TonBoostController.getUserTonBoosts);
  app.post("/api/ton-boosts/purchase", TonBoostController.purchaseTonBoost);
  app.post("/api/ton-boosts/confirm-payment", TonBoostController.confirmExternalPayment);
  app.post("/api/ton-boosts/process-incoming-transaction", async (req, res) => {
    // [АУДИТ ПЛАТЕЖЕЙ - УБРАТЬ ПОСЛЕ ТЕСТИРОВАНИЯ]
    console.log("[TON AUDIT] Входящий API запрос processIncomingTransaction:", { 
      body: req.body,
      senderAddress: req.body.sender_address,
      amount: req.body.amount,
      amountType: typeof req.body.amount
    });
    
    return await TonBoostController.processIncomingTransaction(req, res);
  });
  app.get("/api/ton-farming/info", TonBoostController.getUserTonFarmingInfo);
  app.get("/api/ton-farming/update-balance", TonBoostController.calculateAndUpdateTonFarming);

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
  
  // Создаем WebSocket сервер на отдельном пути, чтобы не конфликтовать с Vite HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Обработка подключений WebSocket
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('[WebSocket] Новое подключение установлено');
    
    // Отправляем приветственное сообщение
    ws.send(JSON.stringify({ type: 'connected', message: 'Соединение с сервером успешно установлено' }));
    
    // Отправляем периодические пинги для поддержания соединения
    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 30000); // каждые 30 секунд
    
    // Обработка сообщений от клиента
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Получено сообщение:', data);
        
        // Обработка различных типов сообщений
        if (data.type === 'pong') {
          // Пользователь ответил на пинг
          console.log('[WebSocket] Получен pong от клиента');
        } else if (data.type === 'subscribe' && data.userId) {
          // Подписка на обновления для конкретного пользователя
          ws.userId = data.userId;
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            userId: data.userId,
            message: `Подписка на обновления для пользователя ${data.userId} оформлена` 
          }));
        }
      } catch (error) {
        console.error('[WebSocket] Ошибка обработки сообщения:', error);
      }
    });
    
    // Обработка закрытия соединения
    ws.on('close', () => {
      console.log('[WebSocket] Соединение закрыто');
      clearInterval(pingInterval);
    });
    
    // Обработка ошибок
    ws.on('error', (error) => {
      console.error('[WebSocket] Ошибка соединения:', error);
    });
  });
  
  // Функция для отправки обновлений всем подключенным пользователям
  // Можно использовать из других модулей, например из сервисов
  (global as any).broadcastUserUpdate = (userId: number, data: any) => {
    wss.clients.forEach((client: WebSocket) => {
      const extClient = client as ExtendedWebSocket;
      if (extClient.readyState === WebSocket.OPEN && extClient.userId === userId) {
        extClient.send(JSON.stringify({
          type: 'update',
          ...data
        }));
      }
    });
  };
  
  return httpServer;
}