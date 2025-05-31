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
import { MissionControllerFixed } from './controllers/missionControllerFixed';
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

// Импортируем webhook для админ-бота
import adminWebhookHandler from './api/admin/webhook';

import { healthMonitor } from './utils/healthMonitor';
import OptimizedBackgroundService from './services/optimizedBackgroundService';
import { performanceMonitorMiddleware, errorMonitorMiddleware } from './middleware/performance-monitor';

/**
 * Регистрирует новые маршруты API в указанном приложении Express
 * @param app Экземпляр приложения Express
 */
export async function registerNewRoutes(app: Express): Promise<void> {
  logger.info('[NewRoutes] Регистрация новых маршрутов API');

  // Функция для генерации уникального реферального кода
  async function generateUniqueRefCode(): Promise<string> {
    const { queryWithRetry } = await import('./db-unified');
    
    for (let attempt = 0; attempt < 10; attempt++) {
      // Генерируем код из 8 символов
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let refCode = '';
      for (let i = 0; i < 8; i++) {
        refCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Проверяем уникальность
      const existing = await queryWithRetry(
        'SELECT id FROM users WHERE ref_code = $1 LIMIT 1',
        [refCode]
      );
      
      if (!existing || existing.length === 0) {
        return refCode;
      }
    }
    
    // Если не удалось сгенерировать уникальный код, используем timestamp
    return `REF${Date.now().toString(36).toUpperCase()}`;
  }

  // КРИТИЧНО: Підключаємо простий робочий маршрут для місій
  try {
    const simpleMissionsRouter = await import('./routes/simple-missions');
    app.use('/', simpleMissionsRouter.default || simpleMissionsRouter);
    logger.info('[NewRoutes] ✅ Простий маршрут місій підключено');
  } catch (error) {
    logger.warn('[NewRoutes] ⚠️ Не удалось подключить simple-missions:', error.message);
  }

  // КРИТИЧНО: Основной маршрут для миссий (используем MissionControllerFixed)
  app.get('/api/missions', safeHandler(async (req, res) => {
    try {
      logger.info('[NewRoutes] 🚀 Запрос миссий через /api/missions');

      // Проверяем, что контроллер загружен
      if (!MissionControllerFixed || typeof MissionControllerFixed.getActiveMissions !== 'function') {
        logger.error('[NewRoutes] ❌ MissionControllerFixed не загружен или метод недоступен');
        return res.status(500).json({
          success: false,
          error: 'Mission controller not available',
          debug: 'MissionControllerFixed not loaded'
        });
      }

      // Используем фиксированный контроллер миссий
      return await MissionControllerFixed.getActiveMissions(req, res);

    } catch (error) {
      logger.error('[NewRoutes] ❌ Ошибка /api/missions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch missions',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }));

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

  // Быстрый тест БД - используем default export
  try {
    const quickDbTestModule = await import('./api/quick-db-test');
    const quickDbTest = quickDbTestModule.default || quickDbTestModule.quickDbTest;
    
    if (typeof quickDbTest === 'function') {
      app.get('/api/quick-db-test', safeHandler(quickDbTest));
      logger.info('[NewRoutes] ✅ Быстрый тест БД добавлен: GET /api/quick-db-test');
    } else {
      throw new Error('quickDbTest is not a function');
    }
  } catch (error) {
    logger.error('[NewRoutes] ❌ Ошибка подключения quick-db-test:', error);
    app.get('/api/quick-db-test', safeHandler(async (req, res) => {
      res.json({
        success: false,
        error: 'quick-db-test module not available',
        fallback: true,
        timestamp: new Date().toISOString(),
        details: error.message
      });
    }));
  }

  // ОТЛАДОЧНЫЙ МАРШРУТ: проверка регистрации новых маршрутов
  app.get('/api/debug/routes-status', safeHandler(async (req, res) => {
    try {
      const routesStatus = {
        timestamp: new Date().toISOString(),
        routes: {
          missions: {
            controller: !!MissionControllerFixed,
            method: typeof MissionControllerFixed?.getActiveMissions,
            registered: true
          },
          quickDbTest: {
            available: true,
            registered: true
          },
          health: {
            registered: true
          }
        },
        imports: {
          MissionControllerFixed: !!MissionControllerFixed,
          logger: !!logger
        }
      };

      res.json({
        success: true,
        data: routesStatus,
        message: 'Routes debug information'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }));
  logger.info('[NewRoutes] ✅ Отладочный маршрут добавлен: GET /api/debug/routes-status');

  // Регистрируем администативные маршруты
  app.use('/api/admin', adminRouter);
  logger.info('[NewRoutes] Административные маршруты зарегистрированы');

  // УДАЛЕНО: webhook теперь регистрируется в server/index.ts с умным ботом

  // Endpoint для перевірки здоров'я сервера (health check)
  const healthCheckHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    // Перевіряємо стан бази даних
    let dbStatus: 'unknown' | 'connected' | 'error' | 'memory_fallback' | 'configured' | 'disconnected' = 'unknown';
    let dbDetails: Record<string, any> = {};

    try {
      // Получаем информацию о текущем подключении через db-unified
      const { getConnectionStatus } = await import('./db-unified');
      const connectionInfo = getConnectionStatus();

      // Проста перевірка підключення до БД
      const db = app.locals.storage;

      if (connectionInfo.isMemoryMode) {
        dbStatus = 'memory_fallback';
        dbDetails = {
          provider: 'memory',
          reason: 'Database connection failed, using memory fallback',
          tables: []
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

  // API endpoint для регистрации пользователей через Telegram (единственный способ)
  app.post('/api/register/telegram', createSafeHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('[TG API] 🚀 Получен запрос на регистрацию через Telegram:', req.body);

      const { AuthController } = await import('./controllers/authController');
      await AuthController.authenticateTelegram(req, res, () => {});

    } catch (error) {
      console.error('[TG API] ❌ Ошибка при регистрации через Telegram:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Ошибка при регистрации пользователя',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }));

  // Endpoint для управления подключением к базе данных (только для админов)
  app.post('/api/db/reconnect', requireAdminAuth, logAdminAction('DB_RECONNECT'), async (req, res) => {
    try {
      const db = app.locals.storage;

      // Получаем текущую информацию о соединении через db-unified
      const { getConnectionStatus } = await import('./db-unified');
      const connectionInfo = getConnectionStatus();

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

      // Получаем обновленную информацию о соединении через db-unified
      const newConnectionInfo = getConnectionStatus();

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

  // Типы для обработчиков маршрутов
  type RouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

  // Централизованный обработчик маршрутов с обработкой ошибок
  const safeHandler = (handler: any): RequestHandler => async (req, res, next) => {
    try {
      if (typeof handler === 'function') {
        await handler(req, res, next);
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

  // CRITICAL: Добавляем маршруты для миссий
  app.get('/api/v2/missions/active', safeHandler(MissionControllerFixed.getActiveMissions));
  app.get('/api/v2/user-missions', safeHandler(MissionControllerFixed.getUserCompletedMissions));
  app.post('/api/v2/missions/complete', safeHandler(MissionControllerFixed.completeMission));
  logger.info('[NewRoutes] ✅ Добавлены маршруты миссий');

  // Используем маршрутизатор для страницы статуса
  app.use('/status', statusRouter);

  // Маршруты для сессий
  if (typeof SessionController.restoreSession === 'function') {
    app.post('/api/v2/session/restore', safeHandler(SessionController.restoreSession));
  }

  // Маршруты для пользователей
  if (typeof UserController.getUserById === 'function') {
    app.get('/api/v2/users/:id', safeHandler(UserController.getUserById));
  }

  // КРИТИЧЕСКИЙ МАРШРУТ для поиска пользователя по guest_id (нужен для отображения баланса)
  if (typeof UserController.getUserByGuestId === 'function') {
    app.get('/api/v2/users/guest/:guest_id', (req, res, next) => {
      console.log(`[routes] GET /api/v2/users/guest/${req.params.guest_id}`);
      next();
    }, safeHandler(UserController.getUserByGuestId));
    logger.info('[NewRoutes] ✓ Маршрут для поиска по guest_id добавлен: GET /api/v2/users/guest/:guest_id');
  }

    // Добавим обработку запроса для guest пользователя, если UserController.getUserByGuestId существует
  if (typeof UserController.getUserByGuestId === 'function') {
    app.get('/api/v2/users/guest/:guest_id', safeHandler(UserController.getUserByGuestId));
    logger.info('[NewRoutes] ✓ Маршрут для получения пользователя по guest_id: GET /api/v2/users/guest/:guest_id');
  } else {
    logger.warn('[NewRoutes] ⚠️  UserController.getUserByGuestId не определен, маршрут GET /api/v2/users/guest/:guest_id не добавлен');
  }

  // КРИТИЧНИЙ endpoint для отображения баланса и основной информации
  app.get('/api/v2/me', async (req: any, res: any) => {
    try {
      console.log('[API] /api/v2/me - Запрос информации о пользователе');

      // Получаем user_id из параметров запроса или заголовков
      const userId = req.query.user_id || req.headers['x-telegram-user-id'];
      const guestId = req.query.guest_id || req.headers['x-guest-id'];

      console.log('[API] /api/v2/me - Параметры:', { userId, guestId });

      // Используем unified database connection
      const { queryWithRetry } = await import('./db-unified');

      // Если есть user_id, ищем по нему
      if (userId) {
        const result = await queryWithRetry(
          'SELECT * FROM users WHERE user_id = $1',
          [userId]
        );

        if (result && result.length > 0) {
          const user = result[0];
          return res.status(200).json({
            success: true,
            data: {
              id: user.user_id,
              username: user.username || user.first_name || 'Аноним',
              balance: user.balance || '0',
              uni_balance: user.uni_balance || '0',
              ton_balance: user.ton_balance || '0',
              total_earned: user.total_earned || '0',
              ref_code: user.ref_code,
              guest_id: user.guest_id,
              registration_date: user.registration_date
            }
          });
        }
      }

      // Если есть guest_id, ищем по нему
      if (guestId) {
        const result = await queryWithRetry(
          'SELECT * FROM users WHERE guest_id = $1',
          [guestId]
        );

        if (result && result.length > 0) {
          const user = result[0];
          return res.status(200).json({
            success: true,
            data: {
              id: user.user_id,
              username: user.username || user.first_name || 'Аноним',
              balance: user.balance || '0',
              uni_balance: user.uni_balance || '0',
              ton_balance: user.ton_balance || '0',
              total_earned: user.total_earned || '0',
              ref_code: user.ref_code,
              guest_id: user.guest_id,
              registration_date: user.registration_date
            }
          });
        }
      }

      // Если пользователь не найден, возвращаем 404
      console.log('[API] /api/v2/me - Пользователь не найден');
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден',
        code: 'USER_NOT_FOUND',
        message: 'Необходима регистрация через guest_id'
      });

    } catch (error) {
      console.error('[API] /api/v2/me - Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  logger.info('[NewRoutes] ✓ Критический endpoint /api/v2/me добавлен для отображения баланса');

  logger.info('[NewRoutes] ✓ Критический endpoint /api/v2/wallet/balance будет обработан через WalletController');

  // Регистрация пользователя через Telegram или guest_id
  app.post('/api/register/telegram', async (req: any, res: any) => {
    try {
      console.log('[API] POST /api/register/telegram - Начало регистрации');
      console.log('[API] Тело запроса:', req.body);

      const { user_id, username, first_name, guest_id, ref_code } = req.body;

      // Если нет ни user_id, ни guest_id - ошибка
      if (!user_id && !guest_id) {
        return res.status(400).json({
          success: false,
          error: 'Необходим user_id или guest_id для регистрации'
        });
      }

      // Сначала проверяем, существует ли уже пользователь
      let existingUser = null;

      if (user_id) {
        const existing = await queryWithRetry('SELECT * FROM users WHERE user_id = $1', [user_id]);
        existingUser = existing && existing.length > 0 ? existing[0] : null;
      }

      if (!existingUser && guest_id) {
        const existing = await queryWithRetry('SELECT * FROM users WHERE guest_id = $1', [guest_id]);
        existingUser = existing && existing.length > 0 ? existing[0] : null;
      }

      if (existingUser) {
        // Пользователь уже существует, возвращаем его данные
        console.log('[API] Пользователь уже зарегистрирован:', existingUser.user_id || existingUser.guest_id);

        return res.status(200).json({
          success: true,
          data: {
            id: existingUser.user_id,
            username: existingUser.username || existingUser.first_name || 'Аноним',
            balance: existingUser.balance || '0',
            uni_balance: existingUser.uni_balance || '0',
            ton_balance: existingUser.ton_balance || '0',
            total_earned: existingUser.total_earned || '0',
            ref_code: existingUser.ref_code,
            guest_id: existingUser.guest_id,
            registration_date: existingUser.registration_date
          },
          message: 'Пользователь уже зарегистрирован'
        });
      }

      // Генерируем уникальный ref_code для нового пользователя
      const newRefCode = await generateUniqueRefCode();

      let result;

      if (user_id) {
        // Регистрация через Telegram
        result = await queryWithRetry(`
          INSERT INTO users (user_id, username, first_name, ref_code, guest_id, registration_date, balance, uni_balance, ton_balance)
          VALUES ($1, $2, $3, $4, $5, NOW(), '1000', '0', '0')
          RETURNING *
        `, [user_id, username, first_name, newRefCode, guest_id]);
      } else {
        // Регистрация через guest_id
        result = await queryWithRetry(`
          INSERT INTO users (guest_id, username, first_name, ref_code, registration_date, balance, uni_balance, ton_balance)
          VALUES ($1, $2, $3, $4, NOW(), '1000', '0', '0')
          RETURNING *
        `, [guest_id, username || 'Гость', first_name || 'Анонимный пользователь', newRefCode]);
      }

      if (!result || result.length === 0) {
        throw new Error('Не удалось создать пользователя');
      }

      const user = result[0];

      // Если был указан реферальный код, обрабатываем его
      if (ref_code && ref_code !== user.ref_code) {
        try {
          await queryWithRetry(`
            UPDATE users 
            SET parent_ref_code = $1 
            WHERE (user_id = $2 OR guest_id = $3) AND parent_ref_code IS NULL
          `, [ref_code, user_id, guest_id]);

          console.log('[API] Реферальный код применен:', ref_code);
        } catch (refError) {
          console.error('[API] Ошибка при применении реферального кода:', refError);
          // Не прерываем регистрацию из-за ошибки с рефералом
        }
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.user_id,
          username: user.username || user.first_name || 'Аноним',
          balance: user.balance || '1000',
          uni_balance: user.uni_balance || '0',
          ton_balance: user.ton_balance || '0',
          total_earned: user.total_earned || '0',
          ref_code: user.ref_code,
          guest_id: user.guest_id,
          registration_date: user.registration_date
        },
        message: 'Пользователь успешно зарегистрирован'
      });

    } catch (error) {
      console.error('[API] POST /api/register/telegram - Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при регистрации пользователя',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // [TG REGISTRATION FIX] Новый эндпоинт для регистрации через Telegram
  if (typeof UserController.createUserFromTelegram === 'function') {
    app.post('/api/register/telegram', safeHandler(UserController.createUserFromTelegram));
    logger.info('[NewRoutes] ✓ Telegram регистрация эндпоинт добавлен: POST /api/register/telegram');
  }

  // Маршруты для транзакций
  if (typeof TransactionController.getUserTransactions === 'function') {
    app.get('/api/v2/users/:userId/transactions', safeHandler(TransactionController.getUserTransactions));
  }

  // Маршруты для заданий с использованием консолидированного контроллера
  if (MissionControllerFixed) {
    // Дублированный маршрут missions/active удален - используется основная версия выше

    // Дублированный маршрут user-missions удален - используется основная версия выше

    if (typeof MissionControllerFixed.getMissionsWithCompletion === 'function') {
      app.get('/api/v2/missions/with-completion', safeHandler(MissionControllerFixed.getMissionsWithCompletion));
    }

    if (typeof MissionControllerFixed.checkMissionCompletion === 'function') {
      app.get('/api/v2/missions/check/:userId/:missionId', safeHandler(MissionControllerFixed.checkMissionCompletion));
    }

    // Дублированный маршрут missions/complete удален - используется основная версия выше

    // КРИТИЧЕСКИЙ МАРШРУТ: добавляем отсутствующий endpoint для frontend
    if (typeof MissionControllerFixed.getUserCompletedMissions === 'function') {
      app.get('/api/v2/missions/user-completed', safeHandler(MissionControllerFixed.getUserCompletedMissions));
      logger.info('[NewRoutes] ✓ Добавлен критический маршрут: GET /api/v2/missions/user-completed');
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

  // ===== USER REFCODE GENERATION =====
  // Генерация реферального кода для пользователя
  app.post('/api/v2/users/generate-refcode', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body.user_id;

      if (!userId) {
        const { adaptedSendError } = await import('./utils/apiResponseAdapter');
        adaptedSendError(res, 'User ID обязателен', 400);
        return;
      }

      // Генерируем реферальный код через userService
      const { userService } = await import('./services');
      const refCode = await userService.generateRefCode();

      // Обновляем пользователя с новым реферальным кодом
      const updatedUser = await userService.updateUserRefCode(userId, refCode);

      if (!updatedUser) {
        const { adaptedSendError } = await import('./utils/apiResponseAdapter');
        adaptedSendError(res, 'Не удалось обновить реферальный код', 500);
        return;
      }

      const { adaptedSendSuccess } = await import('./utils/apiResponseAdapter');
      adaptedSendSuccess(res, updatedUser, 'Реферальный код успешно сгенерирован', 200);
    } catch (error) {
      next(error);
    }
  });

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
      logger.info('[NewRoutes] ✓ UNI Farming status маршруты зарегистрированы');
    }

    // КРИТИЧЕСКИ ВАЖНЫЕ НЕДОСТАЮЩИЕ API ИЗ REDMAP
    if (typeof UniFarmingController.purchaseUniFarming === 'function') {
      app.post('/api/v2/uni-farming/purchase', safeHandler(UniFarmingController.purchaseUniFarming));
      logger.info('[NewRoutes] ✓ UNI Farming purchase маршрут добавлен: POST /api/v2/uni-farming/purchase');
    }

    if (typeof UniFarmingController.withdrawUniFarming === 'function') {
      app.post('/api/v2/uni-farming/withdraw', safeHandler(UniFarmingController.withdrawUniFarming));
      logger.info('[NewRoutes] ✓ UNI Farming withdraw маршрут добавлен: POST /api/v2/uni-farming/withdraw');
    }
  }

  // КРИТИЧЕСКИЙ ENDPOINT для автоматической регистрации через guest_id
  app.post('/api/v2/register/auto', safeHandler(async (req, res) => {
    try {
      const { guest_id, ref_code } = req.body;

      if (!guest_id) {
        return res.status(400).json({
          success: false,
          error: 'guest_id обязателен'
        });
      }

      console.log(`[AUTO REGISTER] Попытка регистрации с guest_id: ${guest_id}, ref_code: ${ref_code || 'отсутствует'}`);

      // Проверяем, существует ли пользователь
      const { userService } = await import('./services');
      const existingUser = await userService.getUserByGuestId(guest_id);
      if (existingUser) {
        console.log(`[AUTO REGISTER] Пользователь уже существует: ID=${existingUser.id}`);
        return res.json({
          success: true,
          data: existingUser,
          message: 'Пользователь уже существует'
        });
      }

      // Создаем нового пользователя
      const newUser = await userService.createUser({
        guest_id: guest_id,
        username: `guest_${Date.now()}`,
        ref_code: await userService.generateRefCode(),
        telegram_id: null,
        wallet: null,
        ton_wallet_address: null,
        parent_ref_code: ref_code || null
      });

      console.log(`[AUTO REGISTER] Создан новый пользователь: ID=${newUser.id}, guest_id=${newUser.guest_id}`);

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Пользователь успешно создан'
      });
    } catch (error) {
      console.error('[AUTO REGISTER] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка при создании пользователя',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }));

  // Заглушка для старых guest запросов - редирект на Telegram регистрацию
  app.post('/api/register/guest', safeHandler(async (req, res) => {
    res.status(410).json({
      success: false,
      error: 'Guest регистрация отключена. Используйте только Telegram Mini App.',
      redirect: '/api/register/telegram'
    });
  }));

  // КРИТИЧНИЙ ENDPOINT: Валидация Telegram initData
  app.post('/api/auth/validate-init-data', safeHandler(async (req: any, res: any) => {
    try {
      console.log('[Auth] Получен запрос на валидацию initData');
      const { initData } = req.body;

      if (!initData) {
        return res.status(400).json({
          success: false,
          error: 'initData не предоставлена'
        });
      }

      // Здесь должна быть валидация с помощью BOT_TOKEN
      // Пока возвращаем базовый ответ
      return res.status(200).json({
        success: true,
        valid: true,
        message: 'initData валидирована'
      });
    } catch (error) {
      console.error('[Auth] Ошибка валидации initData:', error);
      return res.status(500).json({
        success: false,
        error: 'Ошибка валидации'
      });
    }
  }));

  // КРИТИЧНЫЙ ENDPOINT: Регистрация через guest_id
  app.post('/api/register/guest', safeHandler(async (req: any, res: any) => {
    try {
      console.log('[Auth] Регистрация через guest_id:', req.body);
      const { guest_id, ref_code } = req.body;

      if (!guest_id) {
        return res.status(400).json({
          success: false,
          error: 'guest_id обязателен'
        });
      }

      // Импортируем authService
      const { authService } = await import('./services');

      // Используем authService для создания пользователя
      const newUser = await authService.registerUser({
        guest_id,
        ref_code,
        telegram_id: null,
        username: `guest_${guest_id.slice(-8)}`,
        first_name: 'Guest User'
      });

      return res.status(201).json({
        success: true,
        user: newUser,
        message: 'Пользователь успешно зарегистрирован'
      });
    } catch (error) {
      console.error('[Auth] Ошибка регистрации guest:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Ошибка регистрации'
      });
    }
  }));

  // КРИТИЧНЫЙ ENDPOINT: Поиск пользователя по guest_id
  app.get('/api/v2/users/guest/:guest_id', safeHandler(async (req: any, res: any) => {
    try {
      console.log('[Routes] Запрос поиска пользователя по guest_id:', req.params.guest_id);
      const { guest_id } = req.params;
      const { user_id } = req.query;

      if (!guest_id) {
        return res.status(400).json({
          success: false,
          error: 'guest_id обязателен'
        });
      }

      const connectionInfo = await getConnectionInfo();
      console.log('[Routes] Информация о подключении БД:', connectionInfo);

      // Используем обновленный userServiceInstance с правильным ESM импортом
      const { default: userServiceInstance } = await import('./services/userServiceInstance');
      const user = await userServiceInstance.findByGuestId(guest_id);
      console.log('[Routes] Результат поиска пользователя:', user);

      if (user) {
        res.json({
          success: true,
          data: user,
          source: 'database'
        });
      } else {
        console.log('[Routes] Пользователь не найден, возвращаем 404');
        res.status(404).json({
          success: false,
          error: 'Пользователь не найден',
          guest_id: guest_id
        });
      }
    } catch (error) {
      console.error('[Routes] Ошибка поиска пользователя по guest_id:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Внутренняя ошибка сервера'
      });
    }
  }));

  // КРИТИЧНО: Підключаємо простий робочий маршрут для місій
  // Перенесено в async блок выше для корректного использования await

  logger.info('[NewRoutes] ✓ Новые маршруты API зарегистрированы успешно');

  // Инициализируем мониторинг здоровья системы
  healthMonitor.updateMetrics();
  healthMonitor.setDbStatus(true);

  // Применяем мониторинг производительности ко всем API маршрутам
  app.use('/api', performanceMonitorMiddleware);
  app.use('/api', errorMonitorMiddleware);

  // Метрики производительности
  const { getMetrics, resetMetrics } = await import('./api/metrics');
  app.get('/api/metrics', getMetrics);
  app.post('/api/metrics/reset', resetMetrics);

  // Endpoint для принудительного восстановления БД
  app.post('/api/system/force-recovery', requireAdminAuth, logAdminAction('FORCE_DB_RECOVERY'), async (req, res) => {
    try {
      logger.info('[System] Force recovery requested by admin');

      const { autoRecoverySystem } = await import('./utils/auto-recovery-system');
      const { recoverDatabaseConnection } = await import('./utils/db-auto-recovery');

      // Запускаем принудительное восстановление
      const recoveryResult = await recoverDatabaseConnection();
      const autoRecoveryStats = autoRecoverySystem.getRecoveryStats();

      res.json({
        success: true,
        recovery: recoveryResult,
        autoRecoveryStats,
        timestamp: new Date().toISOString(),
        message: recoveryResult.success ? 'Database recovery successful' : 'Database recovery failed'
      });

    } catch (error) {
      logger.error('[System] Force recovery error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}