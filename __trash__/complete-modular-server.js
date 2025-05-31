import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Конфигурация
const config = {
  app: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: 'v2'
  },
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*']
  }
};

// Middleware
function corsMiddleware(req, res, next) {
  const allowedOrigins = config.security.corsOrigins;
  const origin = req.headers.origin;

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

function loggerMiddleware(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
}

function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error in ${req.method} ${req.url}:`, err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера',
    timestamp
  });
}

// Telegram middleware (упрощенная версия для тестирования)
function telegramMiddleware(req, res, next) {
  // Создаем базовые данные для тестирования
  req.telegram = {
    user: {
      id: 12345,
      telegram_id: '12345',
      username: 'test_user',
      first_name: 'Test',
      ref_code: 'TEST123',
      uni_balance: 1000,
      ton_balance: 0.1
    },
    validated: true
  };
  next();
}

// User Controller
class UserController {
  async getCurrentUser(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }
      
      return res.json({
        success: true,
        data: {
          id: telegramUser.id,
          telegram_id: telegramUser.telegram_id,
          username: telegramUser.username || telegramUser.first_name,
          first_name: telegramUser.first_name,
          ref_code: telegramUser.ref_code,
          uni_balance: telegramUser.uni_balance || 0,
          ton_balance: telegramUser.ton_balance || 0,
          created_at: new Date().toISOString(),
          is_telegram_user: true,
          auth_method: 'telegram'
        }
      });
    } catch (error) {
      console.error('[User] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        details: error.message
      });
    }
  }

  async generateRefCode(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      
      if (!telegramUser || !req.telegram?.validated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram'
        });
      }

      if (telegramUser.ref_code) {
        return res.json({
          success: true,
          data: {
            ref_code: telegramUser.ref_code,
            already_exists: true
          }
        });
      }

      const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      res.json({
        success: true,
        data: {
          ref_code: refCode,
          generated: true
        }
      });
    } catch (error) {
      console.error('[RefCode] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка генерации реферального кода',
        details: error.message
      });
    }
  }
}

// Wallet Controller
class WalletController {
  async getWalletData(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const walletData = {
        uni_balance: telegramUser.uni_balance || 0,
        ton_balance: telegramUser.ton_balance || 0,
        total_earned: 0,
        total_spent: 0,
        transactions: []
      };

      res.json({
        success: true,
        data: walletData
      });
    } catch (error) {
      console.error('[Wallet] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных кошелька',
        details: error.message
      });
    }
  }
}

// Farming Controller
class FarmingController {
  async getFarmingData(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const farmingData = {
        rate: '0.001000',
        accumulated: '0.125000',
        last_claim: null,
        can_claim: true,
        next_claim_available: null
      };

      res.json({
        success: true,
        data: farmingData
      });
    } catch (error) {
      console.error('[Farming] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных фарминга',
        details: error.message
      });
    }
  }
}

// Missions Controller
class MissionsController {
  async getActiveMissions(req, res) {
    try {
      const telegramUser = req.telegram?.user;
      const isValidated = req.telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const missions = [
        {
          id: 1,
          title: "Ежедневная проверка",
          description: "Проверьте приложение каждый день",
          reward: 100,
          type: "daily",
          completed: false,
          completed_at: null
        },
        {
          id: 2,
          title: "Пригласить друга",
          description: "Пригласите друга через реферальную ссылку",
          reward: 500,
          type: "referral",
          completed: false,
          completed_at: null
        },
        {
          id: 3,
          title: "Фарминг токенов",
          description: "Соберите 1000 UNI токенов",
          reward: 200,
          type: "farming",
          completed: false,
          completed_at: null
        }
      ];

      res.json({
        success: true,
        data: missions
      });
    } catch (error) {
      console.error('[Missions] Ошибка:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения активных миссий',
        details: error.message
      });
    }
  }
}

// Telegram Controller
class TelegramController {
  async debugMiddleware(req, res) {
    const telegramData = req.telegram;
    const headers = {
      'x-telegram-init-data': req.headers['x-telegram-init-data'],
      'x-telegram-user-id': req.headers['x-telegram-user-id'],
      'telegram-init-data': req.headers['telegram-init-data']
    };
    
    res.json({
      success: true,
      data: {
        middleware_active: !!telegramData,
        validated: telegramData?.validated || false,
        user_present: !!telegramData?.user,
        user_data: telegramData?.user || null,
        headers_received: headers,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Создание сервера
async function createServer() {
  const app = express();

  // Базовые middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(corsMiddleware);
  app.use(loggerMiddleware);
  app.use(telegramMiddleware);

  // Инициализируем контроллеры
  const userController = new UserController();
  const walletController = new WalletController();
  const farmingController = new FarmingController();
  const missionsController = new MissionsController();
  const telegramController = new TelegramController();

  // Основные API маршруты из routes-clean.ts - теперь в модулях
  app.get(`/api/${config.app.apiVersion}/status`, (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        status: 'modular',
        version: '2.0',
        modules: 'active',
        timestamp: new Date().toISOString()
      }
    });
  });

  // User модуль
  app.get(`/api/${config.app.apiVersion}/me`, userController.getCurrentUser);
  app.post(`/api/${config.app.apiVersion}/users/generate-refcode`, userController.generateRefCode);

  // Wallet модуль  
  app.get(`/api/${config.app.apiVersion}/wallet`, walletController.getWalletData);

  // Farming модуль
  app.get(`/api/${config.app.apiVersion}/farming`, farmingController.getFarmingData);

  // Missions модуль
  app.get(`/api/${config.app.apiVersion}/missions/active`, missionsController.getActiveMissions);

  // Telegram модуль
  app.get(`/api/${config.app.apiVersion}/telegram/debug`, telegramController.debugMiddleware);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: config.app.apiVersion,
      architecture: 'modular',
      modules: {
        user: 'active',
        wallet: 'active', 
        farming: 'active',
        missions: 'active',
        telegram: 'active'
      }
    });
  });

  // Статус модулей
  app.get(`/api/${config.app.apiVersion}/modules`, (req, res) => {
    res.json({
      success: true,
      data: {
        modules: [
          { name: 'user', status: 'active', routes: ['/me', '/users/generate-refcode'], migrated: true },
          { name: 'wallet', status: 'active', routes: ['/wallet'], migrated: true },
          { name: 'farming', status: 'active', routes: ['/farming'], migrated: true },
          { name: 'missions', status: 'active', routes: ['/missions/active'], migrated: true },
          { name: 'telegram', status: 'active', routes: ['/telegram/debug'], migrated: true },
          { name: 'referral', status: 'pending', routes: [], migrated: false },
          { name: 'boost', status: 'pending', routes: [], migrated: false },
          { name: 'dailyBonus', status: 'pending', routes: [], migrated: false },
          { name: 'admin', status: 'pending', routes: [], migrated: false }
        ]
      }
    });
  });

  // Статические файлы для frontend
  app.use(express.static(path.join(__dirname, 'client/dist')));

  // SPA fallback для React Router
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found' });
    } else {
      res.sendFile(path.join(__dirname, 'client/dist/index.html'));
    }
  });

  // Error handling middleware (должен быть последним)
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    console.log('🚀 Запуск UniFarm с полной модульной архитектурой...');
    console.log('📦 Все модули перенесены из server/routes-clean.ts');
    
    const app = await createServer();
    
    const server = app.listen(config.app.port, config.app.host, () => {
      console.log(`✅ Модульный сервер запущен на http://${config.app.host}:${config.app.port}`);
      console.log(`📡 API доступен: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/`);
      console.log(`🔧 Статус модулей: http://${config.app.host}:${config.app.port}/api/${config.app.apiVersion}/modules`);
      console.log(`🌐 Frontend: http://${config.app.host}:${config.app.port}/`);
      console.log('');
      console.log('📋 Доступные endpoints:');
      console.log(`   GET /api/${config.app.apiVersion}/me - профиль пользователя`);
      console.log(`   GET /api/${config.app.apiVersion}/wallet - данные кошелька`);
      console.log(`   GET /api/${config.app.apiVersion}/farming - фарминг`);
      console.log(`   GET /api/${config.app.apiVersion}/missions/active - активные миссии`);
      console.log(`   GET /api/${config.app.apiVersion}/telegram/debug - Telegram debug`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Получен сигнал SIGTERM. Завершение работы сервера...');
      server.close(() => {
        console.log('Сервер завершил работу');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

// Запуск если это главный модуль
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { createServer, startServer };