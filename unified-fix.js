/**
 * Универсальный модуль исправлений для UniFarm
 * 
 * Этот модуль объединяет все необходимые исправления:
 * 1. Стабильное подключение к базе данных Neon
 * 2. Правильные настройки CORS для Telegram Mini App
 * 3. Поддержка сессий и cookies
 * 4. Интеграция с Telegram
 * 
 * Для использования достаточно добавить в начало server/index.ts:
 * import './unified-fix';
 */

// Применяем фикс для базы данных в первую очередь
console.log('[UniFarm Fix] 🛠️ Применение исправлений...');

// Принудительно отключаем Unix сокеты для PostgreSQL
process.env.PGHOST = process.env.PGHOST || 'ep-misty-brook-a4dkea48.us-east-1.aws.neon.tech';
process.env.PGSSLMODE = 'prefer';
process.env.PGSOCKET = '';
process.env.PGCONNECT_TIMEOUT = '10';

// Принудительно переключаем на Neon DB
process.env.DATABASE_PROVIDER = 'neon';
process.env.FORCE_NEON_DB = 'true';
process.env.DISABLE_REPLIT_DB = 'true';
process.env.OVERRIDE_DB_PROVIDER = 'neon';

console.log('[UniFarm Fix] ✅ Фикс подключения к БД применен');

// Экспортируем объект для Express middleware
module.exports = {
  /**
   * Применяет все исправления к приложению Express
   * @param {Object} app - Экземпляр Express
   * @param {Object} storage - Хранилище данных (опционально)
   * @returns {Object} - Экземпляр Express с примененными исправлениями
   */
  applyFixes: function(app, storage) {
    if (!app) {
      throw new Error('[UniFarm Fix] Не предоставлен экземпляр приложения Express');
    }
    
    try {
      // Импортируем необходимые модули
      const crypto = require('crypto');
      const session = require('express-session');
      
      // Проверяем наличие необходимых переменных окружения
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.warn('[UniFarm Fix] ⚠️ Переменная окружения TELEGRAM_BOT_TOKEN не установлена');
        console.warn('Проверка подписи данных Telegram будет отключена');
      }
      
      // ---------- CORS MIDDLEWARE ----------
      const corsMiddleware = (req, res, next) => {
        // Получаем origin из запроса
        const origin = req.headers.origin;
        
        // Список разрешенных источников
        const allowedOrigins = [
          'https://web.telegram.org',
          'https://t.me',
          'https://telegram.org',
          'https://telegram.me'
        ];
        
        // Проверяем, разрешен ли origin
        if (origin) {
          // Если origin в списке разрешенных или режим разработки
          if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            // Устанавливаем конкретный origin вместо * для поддержки credentials
            res.header('Access-Control-Allow-Origin', origin);
            // Важно для работы с cookies
            res.header('Access-Control-Allow-Credentials', 'true');
          } else {
            // В production разрешаем любой origin через wildcard
            // но без credentials (согласно требованиям безопасности)
            res.header('Access-Control-Allow-Origin', '*');
          }
        } else {
          // Для запросов без origin
          res.header('Access-Control-Allow-Origin', '*');
        }
        
        // Общие настройки CORS
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Telegram-Init-Data, X-Telegram-Init-Data, Telegram-Data, X-Telegram-Data, X-Telegram-Auth, X-Telegram-User-Id, X-Telegram-Start-Param, X-Telegram-Platform, X-Telegram-Data-Source, X-Development-Mode, X-Development-User-Id');
        
        // Добавляем Content-Security-Policy для работы в Telegram
        res.header('Content-Security-Policy', "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'");
        
        // Добавляем заголовки для предотвращения кеширования
        res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
        res.header('Surrogate-Control', 'no-store');
        
        // Для предварительных запросов OPTIONS отвечаем сразу
        if (req.method === 'OPTIONS') {
          return res.sendStatus(204);
        }
        
        next();
      };
      
      // Применяем CORS middleware
      app.use(corsMiddleware);
      console.log('[UniFarm Fix] ✅ CORS middleware с поддержкой cookies настроен');
      
      // ---------- SESSIONS MIDDLEWARE ----------
      const sessionOptions = {
        secret: process.env.SESSION_SECRET || 'uni-farm-telegram-mini-app-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'none', // Для работы с Telegram Mini App
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
        }
      };
      
      // В production режиме настраиваем доверие к прокси
      if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
        sessionOptions.cookie.secure = true;
      }
      
      // Добавляем store, если есть доступ к базе данных
      if (process.env.DATABASE_URL) {
        try {
          // Пытаемся использовать connect-pg-simple если он доступен
          const pgSession = require('connect-pg-simple');
          const pgSessionStore = pgSession(session);
          
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false // Для Neon DB
            }
          });
          
          // Создаем таблицу сессий, если ее нет
          pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
              sid VARCHAR NOT NULL PRIMARY KEY,
              sess JSON NOT NULL,
              expire TIMESTAMP(6) NOT NULL
            )
          `).catch(error => {
            console.error('[UniFarm Fix] ⚠️ Ошибка при создании таблицы sessions:', error.message);
          });
          
          // Добавляем хранилище в опции сессии
          sessionOptions.store = new pgSessionStore({
            pool,
            tableName: 'sessions'
          });
          
          console.log('[UniFarm Fix] ✅ Настроено хранение сессий в PostgreSQL');
        } catch (error) {
          console.warn('[UniFarm Fix] ⚠️ Ошибка при настройке хранилища сессий:', error.message);
          console.warn('Используется MemoryStore (не рекомендуется для production)');
        }
      }
      
      // Применяем middleware сессий
      app.use(session(sessionOptions));
      console.log('[UniFarm Fix] ✅ Sessions middleware настроен');
      
      // Добавляем вспомогательные методы в объект запроса
      app.use((req, res, next) => {
        // Инициализируем объект пользователя в сессии, если он отсутствует
        if (!req.session.user) {
          req.session.user = null;
        }
        
        // Добавляем методы для работы с сессией в объект запроса
        req.isAuthenticated = function() {
          return !!req.session.user;
        };
        
        req.login = function(user) {
          req.session.user = user;
        };
        
        req.logout = function() {
          req.session.user = null;
        };
        
        // Продолжаем обработку запроса
        next();
      });
      
      // ---------- TELEGRAM INTEGRATION ----------
      // Middleware для проверки и обработки данных от Telegram
      const telegramAuthMiddleware = (req, res, next) => {
        try {
          // Получаем initData из различных возможных источников
          const initData = req.body.initData || 
                          req.headers['telegram-init-data'] || 
                          req.headers['x-telegram-init-data'];
          
          // Если нет данных, просто продолжаем
          if (!initData) {
            return next();
          }
          
          // Извлекаем данные пользователя без проверки подписи
          // (проверка будет выполнена позже при необходимости)
          try {
            const urlParams = new URLSearchParams(initData);
            const userStr = urlParams.get('user');
            
            if (userStr) {
              const user = JSON.parse(userStr);
              req.telegramUser = user;
              
              // Сохраняем initData для возможной проверки подписи позже
              req.telegramInitData = initData;
              
              // Получаем startParam (для реферальной системы)
              const startParam = urlParams.get('start_param');
              if (startParam) {
                req.telegramStartParam = startParam;
              }
            }
          } catch (error) {
            console.error('[UniFarm Fix] ⚠️ Ошибка при разборе данных пользователя Telegram:', error.message);
          }
          
          next();
        } catch (error) {
          console.error('[UniFarm Fix] ❌ Ошибка в telegramAuthMiddleware:', error.message);
          next();
        }
      };
      
      // Применяем middleware для всех запросов к API
      app.use('/api', telegramAuthMiddleware);
      console.log('[UniFarm Fix] ✅ Telegram Auth middleware настроен');
      
      // ---------- МАРШРУТЫ ДЛЯ TELEGRAM ИНТЕГРАЦИИ ----------
      // Маршрут для восстановления сессии через Telegram
      app.post('/api/telegram/auth', async (req, res) => {
        try {
          // Проверяем наличие данных пользователя
          if (!req.telegramUser) {
            return res.status(400).json({
              success: false,
              error: 'Отсутствуют данные пользователя Telegram'
            });
          }
          
          // Проверяем подпись, если есть токен бота
          let signatureValid = true;
          if (process.env.TELEGRAM_BOT_TOKEN && req.telegramInitData) {
            signatureValid = validateTelegramInitData(req.telegramInitData, process.env.TELEGRAM_BOT_TOKEN);
            
            if (!signatureValid && process.env.NODE_ENV !== 'development') {
              return res.status(403).json({
                success: false,
                error: 'Недействительная подпись данных Telegram'
              });
            }
          }
          
          // Если есть хранилище и метод для работы с пользователями
          if (storage && typeof storage.getUserByTelegramId === 'function') {
            try {
              // Пытаемся найти пользователя по Telegram ID
              let user = await storage.getUserByTelegramId(req.telegramUser.id.toString());
              
              // Если пользователь не найден, создаем нового
              if (!user) {
                // Генерируем уникальный гостевой ID
                const guestId = crypto.randomUUID();
                
                // Создаем нового пользователя
                user = await storage.createUser({
                  username: req.telegramUser.username || `user_${req.telegramUser.id}`,
                  telegram_id: req.telegramUser.id.toString(),
                  first_name: req.telegramUser.first_name,
                  last_name: req.telegramUser.last_name || '',
                  guest_id: guestId,
                  // Если есть реферальный код, сохраняем его
                  parent_ref_code: req.telegramStartParam || null
                });
                
                console.log(`[UniFarm Fix] ✅ Создан новый пользователь с ID: ${user.id}`);
              } else {
                console.log(`[UniFarm Fix] ✅ Найден существующий пользователь с ID: ${user.id}`);
              }
              
              // Сохраняем пользователя в сессии
              if (req.session) {
                req.session.userId = user.id;
                req.session.user = {
                  id: user.id,
                  username: user.username,
                  telegram_id: user.telegram_id
                };
              }
              
              // Возвращаем данные пользователя
              return res.json({
                success: true,
                data: {
                  user_id: user.id,
                  username: user.username,
                  telegram_id: user.telegram_id,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  balance_uni: user.balance_uni,
                  balance_ton: user.balance_ton,
                  ref_code: user.ref_code,
                  created_at: user.created_at
                }
              });
            } catch (storageError) {
              console.error('[UniFarm Fix] ❌ Ошибка при работе с хранилищем:', storageError.message);
              return res.status(500).json({
                success: false,
                error: 'Ошибка при обработке данных пользователя'
              });
            }
          } else {
            // Если storage не доступен, возвращаем только данные из Telegram
            return res.json({
              success: true,
              data: {
                telegram_id: req.telegramUser.id,
                username: req.telegramUser.username,
                first_name: req.telegramUser.first_name,
                last_name: req.telegramUser.last_name,
                is_temporary: true
              }
            });
          }
        } catch (error) {
          console.error('[UniFarm Fix] ❌ Ошибка при авторизации через Telegram:', error.message);
          return res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера при авторизации'
          });
        }
      });
      
      console.log('[UniFarm Fix] ✅ Маршрут авторизации через Telegram настроен');
      
      // ---------- ДИАГНОСТИЧЕСКИЕ ЭНДПОИНТЫ ----------
      // Эндпоинт для проверки состояния сервера
      app.get('/api/diag/health', (req, res) => {
        res.json({
          success: true,
          message: 'Сервер работает',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        });
      });
      
      // Эндпоинт для проверки подключения к базе данных
      app.get('/api/diag/db', async (req, res) => {
        try {
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false
            },
            max: 1
          });
          
          const client = await pool.connect();
          const result = await client.query('SELECT NOW() as time');
          client.release();
          
          await pool.end();
          
          res.json({
            success: true,
            message: 'Подключение к БД работает',
            db_time: result.rows[0].time,
            db_type: 'PostgreSQL (Neon)'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: 'Ошибка при подключении к БД',
            error: error.message
          });
        }
      });
      
      console.log('[UniFarm Fix] ✅ Диагностические эндпоинты настроены');
      
      console.log(`
=======================================================
✅ ВСЕ ИСПРАВЛЕНИЯ UniFarm УСПЕШНО ПРИМЕНЕНЫ!

Теперь доступны:
- Стабильное подключение к Neon DB
- Корректная работа CORS для Telegram Mini App
- Правильная настройка сессий с поддержкой cookies
- Интеграция с Telegram Mini App

Диагностические эндпоинты:
- GET /api/diag/health - проверка статуса сервера
- GET /api/diag/db - проверка подключения к БД

Маршруты Telegram:
- POST /api/telegram/auth - авторизация через Telegram
=======================================================
`);
      
      return app;
    } catch (error) {
      console.error('[UniFarm Fix] ❌ Критическая ошибка при применении исправлений:', error.message);
      console.error(error.stack);
      return app; // Возвращаем оригинальное приложение без изменений
    }
  }
};

// Вспомогательные функции

/**
 * Проверяет подпись данных initData от Telegram
 * @param {string} initData - Строка initData от Telegram
 * @param {string} botToken - Токен бота Telegram
 * @returns {boolean} - Результат проверки
 */
function validateTelegramInitData(initData, botToken) {
  try {
    // Проверяем наличие токена и данных
    if (!botToken || !initData) {
      return false;
    }
    
    // Разбираем строку initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      return false;
    }
    
    // Создаем массив данных для проверки
    const dataCheckArr = [];
    
    // Создаем отсортированный массив параметров (без hash)
    urlParams.forEach((val, key) => {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${val}`);
      }
    });
    
    // Сортируем массив
    dataCheckArr.sort();
    
    // Создаем строку данных
    const dataCheckString = dataCheckArr.join('\n');
    
    // Создаем HMAC-SHA-256 подпись
    const crypto = require('crypto');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Проверяем подпись
    return calculatedHash === hash;
  } catch (error) {
    console.error('[UniFarm Fix] ❌ Ошибка при проверке подписи Telegram:', error.message);
    return false;
  }
}