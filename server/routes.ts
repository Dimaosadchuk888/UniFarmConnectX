import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';

// Расширяем тип WebSocket для поддержки пользовательских свойств
interface ExtendedWebSocket extends WebSocket {
  userId?: number;
}
import { storage } from "./storage";

// Импортируем сервисы
import { UserService } from './services/userService';
import { ReferralService } from './services/referralService';

// Импортируем контроллеры
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionController';
import { FarmingController } from './controllers/farmingController';
import { ReferralController } from './controllers/referralController';

// Импорт обработчика команд для Telegram-бота
import * as telegramBot from './telegramBot';
import { DailyBonusController } from './controllers/dailyBonusController';
import { UniFarmingController } from './controllers/uniFarmingController';
import { BoostController } from './controllers/boostController';
import { TonBoostController } from './controllers/tonBoostController';
import { AuthController } from './controllers/authController';
import { WalletController } from './controllers/walletController';
import { AdminController } from './controllers/adminController';

// Импортируем миграцию для реферальных кодов
import { migrateRefCodes, checkAndUpdateUserRefCode, setRefCodeForUser } from './migrations/refCodeMigration';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Добавляем CORS заголовки для работы с Telegram WebApp
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Добавляем CORS заголовки для поддержки Telegram Mini App
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // Добавляем Content-Security-Policy для работы в Telegram
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");
    
    next();
  });
  
  // АУДИТ: Логирование заголовков всех запросов к API
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Логирование всех заголовков запросов для диагностики проблем с Telegram
    if (req.url.startsWith('/api/')) {
      console.log(`[АУДИТ] [${new Date().toISOString()}] Request to ${req.method} ${req.url}`);
      console.log('[АУДИТ] Headers:', JSON.stringify(req.headers, null, 2));
      
      // Если есть данные от Telegram, логируем их
      const telegramData = req.headers['telegram-data'] || 
                          req.headers['x-telegram-data'] || 
                          req.headers['x-telegram-init-data'];
      if (telegramData) {
        console.log('[АУДИТ] Telegram data found in headers with length:', 
          typeof telegramData === 'string' ? telegramData.length : 'not a string');
      }
    }
    next();
  });
  
  // Простой маршрут для проверки API (для отладки)
  app.get("/api/test-json", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ status: "ok", message: "API работает" }));
  });
  
  // Диагностический эндпоинт для отладки Telegram данных
  app.get("/api/telegram-debug", async (req: Request, res: Response) => {
    try {
      // Определяем тип данных для отладочной информации
      interface TelegramDebugInfo {
        headers: typeof req.headers;
        telegramSpecificHeaders: {
          telegramData: string | string[] | undefined;
          telegramInitData: string | string[] | undefined;
          telegramUserId: string | string[] | undefined;
          startParam: string | string[] | undefined;
        };
        queryParams: typeof req.query;
        timestamp: string;
        environment: string | undefined;
        ipInfo: {
          ip: string | undefined;
          forwardedFor: string | string[] | undefined;
        };
        parsedInitData?: Record<string, any>;
        initDataFormat?: string;
        initDataParseError?: string;
      }

      // Собираем всю информацию об окружении и заголовках
      const debugInfo: TelegramDebugInfo = {
        headers: req.headers,
        telegramSpecificHeaders: {
          telegramData: req.headers['telegram-data'] || req.headers['x-telegram-data'],
          telegramInitData: req.headers['x-telegram-init-data'] || req.headers['initdata'] || req.headers['x-initdata'],
          telegramUserId: req.headers['x-telegram-user-id'] || req.headers['telegram-user-id'],
          startParam: req.headers['x-start-param'],
        },
        queryParams: req.query,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        ipInfo: {
          ip: req.ip,
          forwardedFor: req.headers['x-forwarded-for'],
        }
      };
      
      // Анализируем initData, если она есть
      let initData = debugInfo.telegramSpecificHeaders.telegramInitData as string;
      if (initData) {
        try {
          // Если это строка query-параметров, пытаемся распарсить
          if (initData.includes('=') && initData.includes('&')) {
            const params = new URLSearchParams(initData);
            const parsedData: Record<string, any> = {};
            
            params.forEach((value, key) => {
              // Для безопасности - не показываем полный hash
              if (key === 'hash') {
                parsedData[key] = 'present (masked for security)';
              } 
              // Попытка прочитать JSON в полях user и др.
              else if (key === 'user' || key === 'auth_data') {
                try {
                  parsedData[key] = JSON.parse(value);
                } catch {
                  // Если не JSON, сохраняем как текст
                  parsedData[key] = value;
                }
              } 
              else {
                parsedData[key] = value;
              }
            });
            
            debugInfo.parsedInitData = parsedData;
          } 
          // Если это JSON, пытаемся распарсить
          else {
            try {
              const jsonData = JSON.parse(initData);
              debugInfo.parsedInitData = jsonData;
              
              // Если есть hash, маскируем его для безопасности
              if (jsonData.hash) {
                jsonData.hash = 'present (masked for security)';
              }
            } catch {
              debugInfo.initDataFormat = 'unknown (not query params or JSON)';
            }
          }
        } catch (parseError) {
          debugInfo.initDataParseError = `Error parsing initData: ${(parseError as Error).message}`;
        }
      }
      
      // Логирование для аудита использования
      console.log(`[ДИАГНОСТИКА] Запрос к API telegram-debug от ${req.ip}`);
      
      res.json({
        success: true,
        data: debugInfo
      });
    } catch (error) {
      console.error('[API] Error in telegram-debug endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during diagnostics',
        error: (error as Error).message
      });
    }
  });

  // Маршруты для аутентификации
  app.post("/api/auth/telegram", AuthController.authenticateTelegram);
  
  // Тестовый API для реферальной системы (только для режима разработки)
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/auth/test-referral", async (req: Request, res: Response) => {
      try {
        console.log('[TEST API] Тестирование реферальной системы');
        
        const { referrerId } = req.body;
        
        // Создаем тестового пользователя
        const testUserId = Math.floor(Math.random() * 10000000) + 1000000; // Случайный большой ID
        let isNewUser = true;
        let referrerRegistered = false;
        
        // Создаем нового пользователя, используя сервис напрямую
        // Импортируем UserService в начале файла
        const user = await UserService.createUser({
          telegram_id: testUserId,
          username: `test_user_${testUserId}`,
          balance_uni: "5000", // Тестовый бонус
          balance_ton: "5",
          created_at: new Date()
        });
        
        console.log(`[TEST API] Создан новый тестовый пользователь: ${user.id}, telegram_id: ${testUserId}`);
        
        // Обработка реферальной связи
        if (referrerId) {
          try {
            // Проверяем, существует ли пользователь с указанным referrerId
            let inviterId = parseInt(referrerId);
            if (!isNaN(inviterId)) {
              // Проверяем, существует ли пользователь-приглашающий
              const inviter = await UserService.getUserById(inviterId);
              
              if (inviter) {
                // Создаем реферальную связь (уровень 1)
                const referral = await ReferralService.createReferral({
                  user_id: user.id,
                  inviter_id: inviterId,
                  level: 1,
                  created_at: new Date()
                });
                
                if (referral) {
                  console.log(`[TEST API] Создана реферальная связь: пользователь ${user.id} приглашен пользователем ${inviterId}`);
                  referrerRegistered = true;
                }
              } else {
                console.log(`[TEST API] Пользователь с ID ${inviterId} не найден`);
              }
            }
          } catch (error) {
            console.error('[TEST API] Ошибка при создании реферальной связи:', error);
          }
        }
        
        // Отправляем успешный ответ с данными пользователя
        return res.status(200).json({
          success: true,
          data: {
            user_id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            balance_uni: user.balance_uni,
            balance_ton: user.balance_ton,
            referrer_registered: referrerRegistered,
            test_mode: true
          }
        });
      } catch (error) {
        console.error('[TEST API] Ошибка тестирования реферальной системы:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при тестировании реферальной системы'
        });
      }
    });
  }
  
  // Маршруты для пользователей
  app.get("/api/users/:id", UserController.getUserById);
  app.get("/api/wallet/balance", UserController.getUserBalance);
  app.get("/api/me", UserController.getCurrentUser);
  
  // Отладочный эндпоинт для анализа заголовков и данных пользователя
  app.get("/debug/me/raw", async (req: Request, res: Response) => {
    try {
      // Получаем текущего пользователя из запроса
      const user = req.user;

      // Собираем данные для отладки
      const debugInfo = {
        headers: req.headers,
        user: user,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        forwardedFor: req.headers['x-forwarded-for'],
        cookies: req.cookies,
        telegramSpecificHeaders: {
          telegramData: req.headers['telegram-data'] || req.headers['x-telegram-data'],
          telegramInitData: req.headers['x-telegram-init-data'] || req.headers['initdata'] || req.headers['x-initdata'],
          telegramUserId: req.headers['x-telegram-user-id'] || req.headers['telegram-user-id'],
          startParam: req.headers['x-start-param'],
        },
      };

      // Возвращаем полный отчет
      return res.json({
        success: true,
        data: debugInfo
      });
    } catch (error: any) {
      console.error('[API] Error in /debug/me/raw endpoint:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  // Административные маршруты (защищены ключом)
  app.get("/api/admin/users/list-with-telegram-id", AdminController.listUsersWithTelegramId);
  
  // Маршрут для обработки вебхуков от Telegram (корневой путь /webhook)
  app.post("/webhook", async (req, res) => {
    // Добавляем метки времени и делаем вывод более структурированным
    console.log(`\n[Telegram Webhook] [${new Date().toISOString()}] Получен входящий запрос на /webhook:`);
    
    // Проверка структуры запроса для лучшей диагностики
    if (!req.body) {
      console.warn('[Telegram Webhook] Получен пустой запрос без тела');
      return res.status(400).json({ ok: false, error: 'Empty request body' });
    }
    
    // Логирование в более читабельном формате
    console.log(JSON.stringify(req.body, null, 2));
    
    try {
      // Добавляем проверку на наличие ключевых полей в обновлении
      if (req.body.message) {
        console.log(`[Telegram Webhook] Сообщение от: ${req.body.message.from?.username || req.body.message.from?.id || 'неизвестно'}`);
        if (req.body.message.text) {
          console.log(`[Telegram Webhook] Текст: "${req.body.message.text}"`);
        }
      }
      
      // Обрабатываем обновление
      await telegramBot.handleTelegramUpdate(req.body);
      
      // Успешный ответ
      console.log('[Telegram Webhook] Обновление успешно обработано');
      return res.status(200).json({ ok: true });
    } catch (error: any) {
      // Расширенное логирование ошибок
      console.error('[Telegram Webhook] Ошибка при обработке вебхука:');
      console.error(`   Тип: ${error.name}`);
      console.error(`   Сообщение: ${error.message}`);
      console.error(`   Стек: ${error.stack}`);
      
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // Маршрут для обработки вебхуков от Telegram (сохраняем совместимость)
  app.post("/api/telegram/webhook", async (req, res) => {
    // Добавляем метки времени и делаем вывод более структурированным
    console.log(`\n[Telegram Webhook] [${new Date().toISOString()}] Получен входящий запрос на /api/telegram/webhook:`);
    
    // Проверка структуры запроса для лучшей диагностики
    if (!req.body) {
      console.warn('[Telegram Webhook] Получен пустой запрос без тела');
      return res.status(400).json({ ok: false, error: 'Empty request body' });
    }
    
    // Логирование в более читабельном формате
    console.log(JSON.stringify(req.body, null, 2));
    
    try {
      // Добавляем проверку на наличие ключевых полей в обновлении
      if (req.body.message) {
        console.log(`[Telegram Webhook] Сообщение от: ${req.body.message.from?.username || req.body.message.from?.id || 'неизвестно'}`);
        if (req.body.message.text) {
          console.log(`[Telegram Webhook] Текст: "${req.body.message.text}"`);
        }
      }
      
      // Обрабатываем обновление
      await telegramBot.handleTelegramUpdate(req.body);
      
      // Успешный ответ
      console.log('[Telegram Webhook] Обновление успешно обработано');
      return res.status(200).json({ ok: true });
    } catch (error: any) {
      // Расширенное логирование ошибок
      console.error('[Telegram Webhook] Ошибка при обработке вебхука:');
      console.error(`   Тип: ${error.name}`);
      console.error(`   Сообщение: ${error.message}`);
      console.error(`   Стек: ${error.stack}`);
      
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
  


  // Административные маршруты для управления вебхуком Telegram
  // Эти маршруты должны быть защищены (например, доступны только в режиме разработки)
  if (process.env.NODE_ENV === 'development') {
    
    // Маршрут для запуска миграции реферальных кодов
    app.post("/api/admin/migrate-ref-codes", async (req, res) => {
      try {
        console.log('[Admin API] Запуск миграции реферальных кодов');
        
        const result = await migrateRefCodes();
        
        return res.status(200).json({
          success: true,
          message: `Миграция успешно выполнена. Обновлено ${result.updated} из ${result.total} пользователей`,
          data: result
        });
      } catch (error: any) {
        console.error('[Admin API] Ошибка при выполнении миграции реферальных кодов:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при выполнении миграции реферальных кодов',
          error: error.message
        });
      }
    });
    
    // Маршрут для обновления реферального кода конкретного пользователя
    app.post("/api/admin/update-user-ref-code", async (req, res) => {
      try {
        const { userId } = req.body;
        
        if (!userId || isNaN(Number(userId))) {
          return res.status(400).json({
            success: false,
            message: 'Отсутствует или некорректен обязательный параметр userId'
          });
        }
        
        console.log(`[Admin API] Обновление реферального кода для пользователя ID=${userId}`);
        
        const result = await checkAndUpdateUserRefCode(Number(userId));
        
        return res.status(200).json({
          success: true,
          message: result.updated 
            ? `Реферальный код для пользователя ID=${userId} успешно обновлен: ${result.newRefCode}`
            : `Пользователь ID=${userId} уже имеет реферальный код: ${result.oldRefCode}`,
          data: result
        });
      } catch (error: any) {
        console.error(`[Admin API] Ошибка при обновлении реферального кода:`, error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при обновлении реферального кода',
          error: error.message
        });
      }
    });
    
    // Маршрут для ручной установки реферального кода
    app.post("/api/admin/set-ref-code", async (req, res) => {
      try {
        const { userId, refCode } = req.body;
        
        if (!userId || isNaN(Number(userId)) || !refCode) {
          return res.status(400).json({
            success: false,
            message: 'Отсутствуют или некорректны обязательные параметры userId и refCode'
          });
        }
        
        console.log(`[Admin API] Установка реферального кода ${refCode} для пользователя ID=${userId}`);
        
        const result = await setRefCodeForUser(Number(userId), refCode);
        
        return res.status(result ? 200 : 400).json({
          success: result,
          message: result 
            ? `Реферальный код ${refCode} успешно установлен для пользователя ID=${userId}`
            : `Не удалось установить реферальный код ${refCode} для пользователя ID=${userId}`
        });
      } catch (error: any) {
        console.error(`[Admin API] Ошибка при установке реферального кода:`, error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при установке реферального кода',
          error: error.message
        });
      }
    });
    // Установка webhook
    app.post("/api/telegram/set-webhook", async (req, res) => {
      try {
        const { webhookUrl } = req.body;
        
        if (!webhookUrl) {
          return res.status(400).json({
            success: false,
            message: 'Отсутствует обязательный параметр webhookUrl'
          });
        }
        
        const result = await telegramBot.setWebhook(webhookUrl);
        return res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
        console.error('[Admin API] Ошибка установки вебхука:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при установке вебхука',
          error: error.message
        });
      }
    });
    
    // Удаление webhook
    app.post("/api/telegram/delete-webhook", async (req, res) => {
      try {
        const result = await telegramBot.deleteWebhook();
        return res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
        console.error('[Admin API] Ошибка удаления вебхука:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при удалении вебхука',
          error: error.message
        });
      }
    });
    
    // Получение информации о webhook
    app.get("/api/telegram/webhook-info", async (req, res) => {
      try {
        const result = await telegramBot.getWebhookInfo();
        return res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
        console.error('[Admin API] Ошибка получения информации о вебхуке:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при получении информации о вебхуке',
          error: error.message
        });
      }
    });
    
    // Настройка команд для бота
    app.post("/api/telegram/set-commands", async (req, res) => {
      try {
        console.log('[Admin API] Настройка команд для бота');
        const result = await telegramBot.setMyCommands();
        return res.status(result.success ? 200 : 400).json(result);
      } catch (error: any) {
        console.error('[Admin API] Ошибка установки команд бота:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при установке команд бота',
          error: error.message
        });
      }
    });
    
    // Тестовый маршрут для отправки сообщения через бота
    app.post("/api/telegram/send-test-message", async (req, res) => {
      try {
        const { chatId, message } = req.body;
        
        if (!chatId || !message) {
          return res.status(400).json({
            success: false,
            message: 'Отсутствуют обязательные параметры chatId и message'
          });
        }
        
        console.log(`[Admin API] Отправка тестового сообщения в чат ${chatId}: "${message}"`);
        
        const result = await telegramBot.sendMessage(Number(chatId), message);
        
        return res.status(200).json({
          success: true,
          message: 'Сообщение успешно отправлено',
          result
        });
      } catch (error: any) {
        console.error('[Admin API] Ошибка отправки тестового сообщения:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при отправке тестового сообщения',
          error: error.message
        });
      }
    });
    
    // Маршрут для отправки уведомлений о статусе приложения
    app.post("/api/telegram/notify-app-status", async (req, res) => {
      try {
        const { chatId, status, details } = req.body;
        
        if (!chatId || !status) {
          return res.status(400).json({
            success: false,
            message: 'Отсутствуют обязательные параметры chatId и status'
          });
        }
        
        // Проверяем, что статус имеет допустимое значение
        if (!['started', 'deployed', 'updated', 'error'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Некорректное значение статуса. Допустимые значения: started, deployed, updated, error'
          });
        }
        
        console.log(`[Admin API] Отправка уведомления о статусе приложения: ${status}`);
        
        const result = await telegramBot.sendAppStatusNotification(
          Number(chatId), 
          status as "started" | "deployed" | "updated" | "error",
          details
        );
        
        return res.status(200).json({
          success: true,
          message: `Уведомление о статусе "${status}" успешно отправлено`,
          result
        });
      } catch (error: any) {
        console.error('[Admin API] Ошибка отправки уведомления о статусе:', error);
        return res.status(500).json({
          success: false,
          message: 'Ошибка при отправке уведомления о статусе',
          error: error.message
        });
      }
    });
  }
  
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
  app.post("/api/referral/register-start-param", ReferralController.registerStartParam);
  
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

  // Добавление обработчика для всех маршрутов, которые не соответствуют API
  // Это необходимо для корректной работы с Telegram Mini App
  app.get(/^\/(?!api\/).*$/, (req: Request, res: Response, next: NextFunction) => {
    // Проверка на наличие параметров Telegram WebApp в URL
    const hasTelegramParams = req.query.tgWebAppStartParam || 
                              req.query.tgWebAppData || 
                              req.query.tgWebAppVersion;
                              
    // Логирование для отладки
    if (hasTelegramParams) {
      console.log('[TelegramWebApp] Обнаружены параметры в URL:', req.url);
    }
    
    // Передать управление следующему middleware (в продакшне - будет serveStatic, 
    // в разработке - будет vite middleware из setupVite)
    next();
  });

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