import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import path from "path";
import fs from "fs";

// Расширяем тип WebSocket для поддержки пользовательских свойств
interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  _socket?: {
    remoteAddress?: string;
  };
}
import { storage } from "./storage";

// Импортируем сервисы
import { UserService } from './services/userService';
import { ReferralService } from './services/referralService';
import { ReferralBonusService } from './services/referralBonusService';
import { LaunchLogService } from './services/launchLogService'; // Добавлен сервис логирования запусков
import { db } from './db';
import { referrals, type InsertLaunchLog } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Импортируем контроллеры
import { UserController } from './controllers/userController';
import { TransactionController } from './controllers/transactionController';
import { MissionController } from './controllers/missionController';
import { FarmingController } from './controllers/farmingController';
import { ReferralController } from './controllers/referralController';
import { SessionController } from './controllers/sessionController';
import { runAddGuestIdMigration } from './controllers/migrationController';

// Импорт обработчика команд для Telegram-бота
import * as telegramBot from './telegramBot';
import { TelegramController } from './controllers/telegramController'; // Новый TypeScript контроллер для Telegram
import { DailyBonusController } from './controllers/dailyBonusController';
import { UniFarmingController } from './controllers/uniFarmingController';
import { BoostController } from './controllers/boostController';
import { TonBoostController } from './controllers/tonBoostController';
import { AuthController } from './controllers/authController'; // Обновленный контроллер (SOLID)
import { SecurityController } from './controllers/securityController'; // Новый контроллер безопасности (SOLID)
import { WalletController } from './controllers/walletController';
import { AdminController } from './controllers/adminController';

// Импортируем миграцию для реферальных кодов
import { migrateRefCodes, checkAndUpdateUserRefCode, setRefCodeForUser } from './migrations/refCodeMigration';

// Импортируем middleware для логирования Telegram initData
import { telegramInitDataLogger } from './middleware/telegramInitDataLogger';

// Импортируем централизованный обработчик ошибок
import { errorHandler } from './middleware/errorHandler';

export async function registerRoutes(app: Express): Promise<Server> {
  // Обслуживание статических файлов из папки public
  // Это важно для тестовых HTML-файлов  
  const projectRoot = process.cwd(); 
  const staticFilesPath = path.join(projectRoot, 'server', 'public');
  
  // Используем тип-предохранитель, чтобы решить проблему с типами
  const staticMiddleware = express.static(staticFilesPath);
  app.use('/static', staticMiddleware);
  console.log('[Server] Статические файлы доступны по URL /static из папки:', staticFilesPath);
  
  // Добавляем CORS заголовки для работы с Telegram WebApp
  // Определяем middleware как отдельную функцию для лучшей типизации
  const corsMiddleware: express.RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // Добавляем CORS заголовки для поддержки Telegram Mini App
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Telegram-Init-Data, X-Telegram-Init-Data, Telegram-Data, X-Telegram-Data, X-Telegram-Auth, X-Telegram-User-Id, X-Telegram-Start-Param, X-Telegram-Platform, X-Telegram-Data-Source, X-Development-Mode, X-Development-User-Id");
    
    // Добавляем Content-Security-Policy для работы в Telegram
    res.header("Content-Security-Policy", "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");
    
    next();
  };
  app.use(corsMiddleware);
  
  // АУДИТ: Логирование заголовков всех запросов к API
  const logHeadersMiddleware: express.RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    // Логирование всех заголовков запросов для диагностики проблем с Telegram
    if (req.url.startsWith('/api/')) {
      console.log(`[АУДИТ] [${new Date().toISOString()}] Request to ${req.method} ${req.url}`);
      console.log('[АУДИТ] Headers:', JSON.stringify(req.headers, null, 2));
      
      // Если есть данные от Telegram, логируем их
      const telegramData = req.headers['telegram-data'] || 
                          req.headers['x-telegram-data'] || 
                          req.headers['x-telegram-init-data'] ||
                          req.headers['telegram-init-data'];
      if (telegramData) {
        console.log('[АУДИТ] Telegram data found in headers with length:', 
          typeof telegramData === 'string' ? telegramData.length : 'not a string');
      }
      
      // Проверяем наличие нового заголовка (согласно п.1.2 ТЗ)
      const telegramInitData = req.headers['telegram-init-data'];
      if (telegramInitData) {
        console.log('[АУДИТ] Successfully received Telegram-Init-Data header with length:', 
          typeof telegramInitData === 'string' ? telegramInitData.length : 'not a string');
      }
    }
    next();
  };
  app.use(logHeadersMiddleware);
  
  // Подключаем улучшенный логгер для Telegram initData - анализирует данные подробно
  app.use(telegramInitDataLogger);
  
  // Улучшенные маршруты для работы с Telegram Mini App и настройка статических файлов
  // ВАЖНО: Размещаем express.static ПОСЛЕ маршрута "/", чтобы он не перехватывал наш health check
  
  // Настраиваем обработку статических файлов для разных режимов
  const staticPaths = [
    path.join(projectRoot, 'client', 'dist'), // Режим разработки
    path.join(projectRoot, 'dist', 'public'), // Режим production после сборки
  ];
  
  // Проверяем наличие каждой папки и подключаем только существующие
  staticPaths.forEach(staticPath => {
    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      console.log(`[Server] Статические файлы доступны из: ${staticPath}`);
    }
  });
  
  // Примечание: поддержка статических файлов из папки server/public
  // уже настроена выше, поэтому здесь мы ничего не делаем
  // (ранее здесь был дублирующий код)
  
  // Специальный маршрут для проверки здоровья системы Replit Deployments
  // Этот маршрут необходим для успешной проверки работоспособности при деплое
  // ВАЖНО: Размещаем этот маршрут ПЕРЕД другими маршрутами для корректного обнаружения Replit
  app.get("/", (req, res) => {
    // Отдаем JSON для health check при деплое
    res.setHeader('Content-Type', 'application/json');
    console.log('[Health Check] Запрос health check на корневой маршрут: /', 
      { userAgent: req.headers['user-agent'], ip: req.ip });
    return res.status(200).send(JSON.stringify({ status: "ok", message: "Health check passed" }));
  });

  // Специальные маршруты для Telegram Mini App
  app.get([
    "/UniFarm", "/UniFarm/", "/unifarm", "/unifarm/", 
    "/app", "/app/", 
    "/telegram", "/telegram/",
    "/telegram-app", "/telegram-app/"
  ], (req, res) => {
    try {
      console.log(`[Telegram Mini App] Запрос к специальному маршруту: ${req.path}`);
      
      // В режиме разработки файлы находятся в client/dist
      // В режиме production (после сборки) файлы находятся в dist/public
      
      // Определяем возможные пути к index.html в разных режимах работы
      const possiblePaths = [
        path.join(projectRoot, 'client', 'dist', 'index.html'), // режим разработки
        path.join(projectRoot, 'dist', 'public', 'index.html'), // режим production (после сборки)
        path.join(projectRoot, 'dist', 'index.html'),  // альтернативный вариант
      ];
      
      // Ищем существующий файл среди возможных путей
      const existingPath = possiblePaths.find(p => fs.existsSync(p));
      
      if (existingPath) {
        // Отправляем найденный index.html
        console.log(`[Telegram Mini App] Используем файл: ${existingPath}`);
        res.sendFile(existingPath);
      } else {
        // Если файла нигде нет, отправляем перенаправление на корневой URL
        console.log(`[Telegram Mini App] Файл index.html не найден! Проверенные пути:`, possiblePaths);
        console.log(`[Telegram Mini App] Перенаправление на основной маршрут...`);
        res.redirect('/');
      }
    } catch (error) {
      console.error('Unhandled error in Telegram Mini App route:', error);
      res.status(500).send('Internal Server Error');
    }
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
        validationResult?: {
          isValid: boolean;
          userId: number | null;
          errors?: string[];
          botTokenAvailable: boolean;
          botTokenLength?: number;
        };
      }

      // Собираем всю информацию об окружении и заголовках
      const debugInfo: TelegramDebugInfo = {
        headers: req.headers,
        telegramSpecificHeaders: {
          telegramData: req.headers['telegram-data'] || req.headers['x-telegram-data'],
          telegramInitData: req.headers['telegram-init-data'] || req.headers['x-telegram-init-data'] || req.headers['initdata'] || req.headers['x-initdata'],
          // Не используем прямое чтение telegram_id из заголовков (п.2.1 ТЗ)
          telegramUserId: process.env.NODE_ENV === 'development' ? '(только в режиме разработки)' : '(отключено в production)',
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
            debugInfo.initDataFormat = 'url-encoded';
          } 
          // Если это JSON, пытаемся распарсить
          else {
            try {
              const jsonData = JSON.parse(initData);
              debugInfo.parsedInitData = jsonData;
              debugInfo.initDataFormat = 'json';
              
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
        
        // Добавляем результаты валидации initData
        try {
          // Импортируем функцию валидации
          const { validateTelegramInitData } = await import('./utils/telegramUtils');
          
          // Получаем токен бота из переменных окружения
          const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
          
          // Проверяем данные с различными настройками
          const validationResult = validateTelegramInitData(
            initData,
            botToken,
            {
              maxAgeSeconds: 172800, // 48 часов
              isDevelopment: process.env.NODE_ENV !== 'production',
              requireUserId: false, // Для отладки не требуем
              allowFallbackId: true, // Для отладки разрешаем ID=1
              verboseLogging: true,
              skipSignatureCheck: req.query.skip_signature === 'true'
            }
          );
          
          // Добавляем результат валидации в ответ
          debugInfo.validationResult = {
            isValid: validationResult.isValid,
            userId: validationResult.userId || null,
            errors: validationResult.validationErrors,
            botTokenAvailable: !!botToken,
            botTokenLength: botToken?.length
          };
        } catch (validationError) {
          console.error('Error during initData validation:', validationError);
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

  // Маршруты для аутентификации (обновленный SOLID контроллер)
  app.post("/api/auth/telegram", AuthController.authenticateTelegram);
  
  // Маршрут для восстановления сессии по guest_id (Этап 3)
  app.post("/api/session/restore", SessionController.restoreSession);
  
  // Маршрут для регистрации через Telegram (согласно ТЗ 2.1)
  app.post("/api/register", AuthController.registerUser);
  
  // Маршрут для регистрации пользователя в режиме AirDrop (Этап 4)
  
  // Новые маршруты безопасности (SOLID)
  app.post("/api/security/validate-telegram", SecurityController.validateTelegramInitData);
  app.post("/api/security/check-permission", SecurityController.checkPermission);
  app.post("/api/security/sanitize", SecurityController.sanitizeUserInput);
  app.post("/api/airdrop/register", AuthController.registerGuestUser);
  
  // Маршрут для логирования запусков Mini App (Этап 5.1)
  app.post("/api/log-launch", async (req: Request, res: Response) => {
    try {
      // Получаем информацию о запуске из тела запроса
      const { 
        telegram_user_id,
        ref_code,
        platform,
        timestamp,
        user_agent,
        init_data
      } = req.body;
      
      // Базовая валидация данных запроса
      if (!telegram_user_id) {
        return res.status(400).json({
          success: false,
          message: 'Отсутствует обязательный параметр telegram_user_id'
        });
      }
      
      // Подготавливаем данные для логирования
      const launchData: InsertLaunchLog = {
        telegram_user_id: Number(telegram_user_id),
        ref_code: ref_code || null,
        platform: platform || 'unknown',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        user_agent: user_agent || req.headers['user-agent'] || null,
        init_data: init_data || null,
        ip_address: req.ip || null,
        request_id: crypto.randomUUID(),
        // Пытаемся найти пользователя в нашей системе по telegram_id
        user_id: null // Заполним позже, если найдем пользователя
      };
      
      // Если есть telegram_user_id, пытаемся найти пользователя
      // для привязки записи к конкретному аккаунту
      if (telegram_user_id) {
        try {
          const user = await UserService.getUserByTelegramId(Number(telegram_user_id));
          if (user) {
            launchData.user_id = user.id;
          }
        } catch (error) {
          console.warn(`[launch-log] Не удалось найти пользователя с telegram_id=${telegram_user_id}`);
        }
      }
      
      // Записываем информацию о запуске
      const log = await LaunchLogService.logLaunch(launchData);
      
      // Отправляем успешный ответ
      return res.status(200).json({
        success: true,
        message: 'Запуск успешно записан',
        data: {
          log_id: log.id,
          timestamp: log.timestamp
        }
      });
    } catch (error) {
      console.error('[API] Ошибка при логировании запуска:', error);
      
      // Если это ошибка превышения лимита запросов, возвращаем 429
      if ((error as Error).message.includes('Rate limit exceeded')) {
        return res.status(429).json({
          success: false,
          message: 'Слишком много запросов. Пожалуйста, повторите позже.'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: (error as Error).message
      });
    }
  });
  
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
  // ВАЖНО: Сначала размещаем более специфичные маршруты, потом общие с параметрами
  // Это нужно, потому что Express обрабатывает маршруты в порядке их определения
  // Если маршрут с :id будет первым, то /guest/xxx будет обработан как {id: 'guest'}
  
  // Маршрут для получения пользователя по guest_id
  // Этот маршрут необходим для поддержки метода getUserByGuestId из клиентского сервиса
  app.get("/api/users/guest/:guestId", UserController.getUserByGuestId);
  
  // Более общий маршрут для получения пользователя по ID
  app.get("/api/users/:id", UserController.getUserById);
  app.post("/api/users/generate-refcode", UserController.generateRefCode);
  app.get("/api/wallet/balance", UserController.getUserBalance);
  app.get("/api/me", UserController.getCurrentUser);
  
  // Маршрут для восстановления сессии по guest_id (Этап 3.1)
  app.get("/api/restore-session", SessionController.restoreSession);
  
  // Маршруты для миграций и обслуживания базы данных (только для разработки)
  app.post("/api/migrations/add-guest-id", runAddGuestIdMigration);
  
  // Отладочный эндпоинт для анализа заголовков и данных пользователя
  app.get("/debug/me/raw", async (req: Request, res: Response) => {
    try {
      // В Express user не объявлен в типе Request, добавляем безопасную проверку
      // @ts-ignore используем, поскольку req.user может быть добавлен middleware аутентификации
      const user = req.user || null;

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
          telegramInitData: req.headers['telegram-init-data'] || req.headers['x-telegram-init-data'] || req.headers['initdata'] || req.headers['x-initdata'],
          // Не используем прямое чтение telegram_id из заголовков (согласно п.2.1 ТЗ)
          telegramUserId: process.env.NODE_ENV === 'development' ? '(доступно только в режиме разработки)' : '(отключено в production)',
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
  
  // Новый маршрут для обработки вебхуков от Telegram через TypeScript контроллер

  
  // Добавляем новый эндпоинт для проверки валидации initData с разными настройками
  app.post("/api/telegram/validate-init-data", async (req: Request, res: Response) => {
    try {
      // Получаем параметры из тела запроса
      const { initData, options = {} } = req.body;
      
      if (!initData) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'initData is required'
        });
      }
      
      // Получаем токен бота из переменных окружения
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      
      // Импортируем функцию валидации
      const { validateTelegramInitData, logTelegramData } = await import('./utils/telegramUtils');
      
      // Логируем данные перед валидацией
      logTelegramData(initData, null, 'ValidationEndpoint');
      
      // Объединяем настройки по умолчанию с переданными
      const validationOptions = {
        maxAgeSeconds: 172800, // 48 часов
        isDevelopment: process.env.NODE_ENV !== 'production',
        requireUserId: process.env.NODE_ENV === 'production',
        allowFallbackId: process.env.NODE_ENV !== 'production',
        verboseLogging: true,
        skipSignatureCheck: process.env.NODE_ENV !== 'production',
        ...options
      };
      
      // Проверяем данные
      const validationResult = validateTelegramInitData(
        initData,
        botToken,
        validationOptions
      );
      
      // Логируем результат
      console.log('[ValidationEndpoint] Результаты валидации:', {
        isValid: validationResult.isValid,
        userId: validationResult.userId || null,
        username: validationResult.username,
        errors: validationResult.validationErrors || []
      });
      
      // Отправляем результат
      res.json({
        success: true,
        data: {
          isValid: validationResult.isValid,
          userId: validationResult.userId || null,
          username: validationResult.username,
          firstName: validationResult.firstName,
          lastName: validationResult.lastName,
          startParam: validationResult.startParam,
          errors: validationResult.validationErrors,
          options: validationOptions,
          botTokenAvailable: !!botToken,
          botTokenLength: botToken?.length,
          rawInitDataLength: initData?.length || 0
        }
      });
    } catch (error) {
      console.error('Error in telegram/validate-init-data endpoint:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: `${error}`
      });
    }
  });
  
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
  
  // Маршруты для работы с Telegram Mini App
  app.post("/api/telegram/webhook", TelegramController.handleWebhook);
  app.post("/api/telegram/validate-init-data", TelegramController.validateInitData);
  app.get("/api/telegram/mini-app-info", TelegramController.getMiniAppInfo);
  app.post("/api/telegram/register", TelegramController.registerTelegramUser);
  


  // Тестовый маршрут для проверки защиты от повторного связывания (ТЗ 3.1)
  app.post('/api/test/referral/link', async (req, res) => {
    try {
      const { userId, inviterId } = req.body;
      
      if (!userId || !inviterId) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать userId и inviterId'
        });
      }
      
      console.log(`[TEST] Попытка создания реферальной связи: user=${userId}, inviter=${inviterId}`);
      
      // Используем обновленный метод с защитой от перезаписи
      const result = await ReferralService.createReferralRelationship(Number(userId), Number(inviterId));
      
      return res.status(200).json({
        success: true,
        message: 'Результат операции',
        data: {
          ...result,
          referral: result.referral ? {
            id: result.referral.id,
            user_id: result.referral.user_id,
            inviter_id: result.referral.inviter_id,
            level: result.referral.level,
            created_at: result.referral.created_at
          } : null
        }
      });
    } catch (error: any) {
      console.error('[TEST] Ошибка при тестировании реферальной связи:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  });
  
  // Тестовый маршрут для проверки статуса реферальной связи
  app.get('/api/test/referral/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать userId'
        });
      }
      
      console.log(`[TEST] Проверка реферальной связи для пользователя ID=${userId}`);
      
      // Получаем информацию о пригласителе
      const userInviter = await ReferralService.getUserInviter(Number(userId));
      
      // Получаем все реферальные связи пользователя
      const userReferrals = await ReferralService.getUserReferrals(Number(userId));
      
      // Получаем количество рефералов по уровням
      const referralCounts = await ReferralService.getReferralCounts(Number(userId));
      
      return res.status(200).json({
        success: true,
        message: 'Информация о реферальных связях',
        data: {
          userId: Number(userId),
          hasInviter: !!userInviter,
          inviterId: userInviter ? userInviter.inviter_id : null,
          inviterInfo: userInviter ? {
            id: userInviter.id,
            level: userInviter.level,
            createdAt: userInviter.created_at,
            ref_path: userInviter.ref_path || []
          } : null,
          ref_path: userInviter?.ref_path || [],
          referralsCount: userReferrals.length,
          referralsByLevel: referralCounts,
          referrals: userReferrals.map(ref => ({
            id: ref.id,
            referralId: ref.user_id,
            level: ref.level,
            createdAt: ref.created_at
          })),
          referralChain: userInviter ? [
            {
              id: userInviter.id,
              inviter_id: userInviter.inviter_id,
              level: userInviter.level,
              created_at: userInviter.created_at,
              ref_path: userInviter.ref_path || []
            }
          ] : []
        }
      });
    } catch (error) {
      console.error('[TEST] Ошибка при получении реферальной информации:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: (error as Error).message
      });
    }
  });

  // Тестовый маршрут для проверки активации реферальной цепочки (ТЗ 3.1)
  app.post('/api/test/referral/chain', async (req, res) => {
    try {
      const { userId, inviterId } = req.body;
      
      if (!userId || !inviterId) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать userId и inviterId'
        });
      }
      
      console.log(`[TEST] Попытка создания реферальной цепочки: user=${userId}, inviter=${inviterId}`);
      
      // Проверяем существование пользователей
      const user = await UserService.getUserById(Number(userId));
      const inviter = await UserService.getUserById(Number(inviterId));
      
      if (!user || !inviter) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь или пригласитель не найден'
        });
      }
      
      // Создаем реферальную цепочку с защитой от повторного создания
      const result = await ReferralBonusService.createReferralChain(Number(userId), Number(inviterId));
      
      return res.status(200).json({
        success: true,
        message: 'Результат создания реферальной цепочки',
        data: result
      });
    } catch (error: any) {
      console.error('[TEST] Ошибка при тестировании реферальной цепочки:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
    }
  });
  
  // Этот маршрут удален, так как дублирует ранее созданный
  
  // Тестовый маршрут для создания реферальной связи (Для ТЗ 4.1)
  app.post('/api/test/referral/link', async (req: Request, res: Response) => {
    try {
      const { userId, inviterId } = req.body;
      
      if (!userId || !inviterId) {
        return res.status(400).json({
          success: false,
          message: 'Необходимо указать userId и inviterId'
        });
      }
      
      console.log(`[TEST 4.1] Создание реферальной связи: user=${userId}, inviter=${inviterId}`);
      
      // Проверяем существование пользователей
      const user = await UserService.getUserById(Number(userId));
      const inviter = await UserService.getUserById(Number(inviterId));
      
      if (!user || !inviter) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь или пригласитель не найден'
        });
      }
      
      // Создаем реферальную связь с поддержкой ref_path
      const result = await ReferralService.createReferralRelationship(
        Number(userId), 
        Number(inviterId),
        1 // Уровень = 1 (прямой реферал)
      );
      
      return res.status(200).json({
        success: true,
        message: 'Результат создания реферальной связи',
        data: result
      });
    } catch (error: any) {
      console.error('[TEST 4.1] Ошибка при создании реферальной связи:', error);
      return res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: error.message
      });
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
  app.get("/api/user/wallet-info", WalletController.getWalletInfo);
  app.get("/api/user/transactions", WalletController.getUserTransactions);
  app.post("/api/user/withdraw", WalletController.withdrawFunds);
  
  // Маршруты для транзакций
  app.get("/api/transactions", TransactionController.getUserTransactions);
  app.get("/api/transactions/:user_id", TransactionController.getUserTransactions);
  app.post("/api/withdraw", TransactionController.withdrawFunds);
  app.post("/api/transactions/create", TransactionController.createTransaction);
  
  // Маршруты для миссий
  app.get("/api/missions/active", MissionController.getActiveMissions);
  app.get("/api/user_missions", MissionController.getUserCompletedMissions);
  app.get("/api/missions/with-completion", MissionController.getMissionsWithCompletion);
  app.get("/api/missions/check/:userId/:missionId", MissionController.checkMissionCompletion);
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
  app.post("/api/uni-farming/harvest", UniFarmingController.harvestFarmingInfo);
  
  // Маршруты для буст-пакетов
  app.get("/api/boosts", (req, res, next) => BoostController.getBoostPackages(req, res, next));
  app.get("/api/boosts/active", (req, res, next) => BoostController.getUserActiveBoosts(req, res, next));
  app.post("/api/boosts/purchase", (req, res, next) => BoostController.purchaseBoost(req, res, next));
  
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
  // Специальный маршрут для перенаправления в режиме разработки
  app.get('/dev-mode', (req: Request, res: Response, next: NextFunction) => {
    // В продакшене отдаем index.html, в разработке передаем управление Vite middleware
    if (process.env.NODE_ENV === 'production') {
      const indexPath = path.resolve('dist/public/index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
  
  // Специальные маршруты для Telegram Mini App
  app.get(['/UniFarm', '/UniFarm/', '/app', '/app/', '/unifarm', '/unifarm/'], (req: Request, res: Response, next: NextFunction) => {
    console.log('[TelegramMiniApp] Запрос к специальному пути Telegram Mini App:', req.path);
    
    // В продакшн режиме отдаем index.html
    if (process.env.NODE_ENV === 'production') {
      const indexPath = path.resolve('dist/public/index.html');
      if (fs.existsSync(indexPath)) {
        console.log('[TelegramMiniApp] Отправляем index.html из:', indexPath);
        return res.sendFile(indexPath);
      }
    }
    
    // В режиме разработки передаем управление дальше (в Vite middleware)
    next();
  });

  // Обработчик для URL с завершающим слешем (переработан для исправления проблем с JSON-парсингом)
  app.get('*/', (req: Request, res: Response, next: NextFunction) => {
    // Никогда не делаем редиректы для API-запросов, чтобы избежать проблем с JSON-парсингом
    if (req.path.startsWith('/api/')) {
      console.log('[Route] API-запрос со слэшем в конце - не редиректим:', req.path);
      return next();
    }
    
    // Для отладки (только если это не API-запрос)
    console.log('[Route] Обнаружен путь со слэшем на конце:', req.path, {
      userAgent: req.headers['user-agent']?.substring(0, 30) + '...',
      isAPI: req.path.startsWith('/api/'),
      referrer: req.headers['referer'],
    });
    
    // Проверяем, является ли запрос от Telegram Mini App
    const isTelegramUserAgent = req.headers['user-agent']?.includes('TelegramWebApp') || 
                               req.headers['user-agent']?.includes('Telegram');
    const hasTelegramData = !!(req.headers['telegram-data'] || req.headers['x-telegram-data'] || 
                          req.headers['telegram-init-data'] || req.headers['x-telegram-init-data']);
    
    // Для корневого пути с завершающим слэшем (который BotFather добавляет автоматически)
    if (req.path === '/') {
      console.log('[Route] Корневой путь с завершающим слэшем - не редиректим');
      return next();
    }
    
    // Если запрос от Telegram и запрашивается путь с завершающим слэшем
    if ((isTelegramUserAgent || hasTelegramData) && req.path.endsWith('/')) {
      // Для путей, которые используются в Telegram Mini App, не делаем редирект
      if (req.path === '/UniFarm/' || req.path === '/app/' || req.path === '/unifarm/') {
        console.log('[Route] Запрос от Telegram к мини-приложению - не редиректим');
        return next();
      }
    }
    
    // Проверяем Content-Type запроса и Accept заголовок
    const contentType = req.headers['content-type'] || '';
    const acceptHeader = req.headers['accept'] || '';
    
    // Не делаем редирект для запросов, ожидающих JSON или отправляющих JSON
    if (contentType.includes('application/json') || acceptHeader.includes('application/json')) {
      console.log('[Route] Запрос JSON с завершающим слэшем - не редиректим:', req.path);
      return next();
    }
    
    // Обычная обработка - удаляем слеш в конце URL для всех остальных случаев
    if (req.path.endsWith('/') && req.path !== '/') {
      console.log('[Route] Редирект URL со слешем в конце:', req.url);
      return res.redirect(301, req.path.slice(0, -1) + req.url.slice(req.path.length));
    } else {
      next();
    }
  });
  
  // Корневой URL всегда обрабатываем обычным образом
  app.get('/', (req: Request, res: Response, next: NextFunction) => {
    // Проверяем, содержит ли URL параметр ref_code, который используется для реферальных ссылок
    if (req.query.ref_code !== undefined) {
      console.log('[TelegramWebApp] Обнаружен запуск через ?ref_code параметр:', req.url);
      
      // Для продакшн-окружения возвращаем index.html
      if (process.env.NODE_ENV === 'production') {
        const indexPath = path.resolve('dist/public/index.html');
        if (fs.existsSync(indexPath)) {
          console.log('[TelegramWebApp] Отправляем index.html из', indexPath);
          return res.sendFile(indexPath);
        } else {
          console.warn('[TelegramWebApp] Файл index.html не найден по пути:', indexPath);
          // Пробуем альтернативные пути
          const altPaths = [
            path.resolve('dist/index.html'),
            path.resolve('public/index.html'),
            path.resolve('client/dist/index.html')
          ];
          
          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              console.log('[TelegramWebApp] Отправляем index.html из альтернативного пути:', altPath);
              return res.sendFile(altPath);
            }
          }
        }
      }
    }
    next();
  });
  
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

  // Использование централизованного обработчика ошибок из middleware/errorHandler
  app.use(errorHandler);

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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
      }
    }, 30000); // каждые 30 секунд
    
    // Обработка сообщений от клиента
    ws.on('message', (message: Buffer | string) => {
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
    ws.on('error', (error: Error) => {
      // Структурированное логирование ошибки соединения
      console.error('[WebSocket] [Ошибка соединения]', {
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        userId: ws.userId || 'не определён',
        timestamp: new Date().toISOString()
      });
      
      // В режиме разработки выводим полный стек ошибки
      if (process.env.NODE_ENV === 'development') {
        console.error('[WebSocket] [Стек ошибки]:', error);
      }
    });
  });
  
  /**
   * Функция для отправки обновлений всем подключенным пользователям
   * Можно использовать из других модулей, например из сервисов
   * @param userId Идентификатор пользователя
   * @param data Данные для отправки
   */
  (global as any).broadcastUserUpdate = (userId: number, data: Record<string, unknown>): void => {
    wss.clients.forEach((client: WebSocket) => {
      try {
        const extClient = client as ExtendedWebSocket;
        if (extClient.readyState === WebSocket.OPEN && extClient.userId === userId) {
          extClient.send(JSON.stringify({
            type: 'update',
            ...data
          }));
        }
      } catch (error) {
        // Структурированное логирование ошибки
        console.error('[WebSocket] [Ошибка отправки] Не удалось отправить обновление пользователю:', {
          userId,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          timestamp: new Date().toISOString()
        });
        
        // В производственной среде не выводим полный стек ошибки
        if (process.env.NODE_ENV === 'development') {
          console.error('[WebSocket] [Стек ошибки]:', error);
        }
      }
    });
  };
  
  // Для успешного прохождения Replit делпоя
  // Мы временно удаляем обработчик маршрута UniFarm
  // Этот обработчик будет добавлен после успешного деплоя
  
  return httpServer;
}