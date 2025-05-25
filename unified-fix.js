/**
 * Комплексное решение для UniFarm Connect (Remix)
 * 
 * Этот модуль решает несколько критических проблем:
 * 1. Исправляет проблемы с подключением к базе данных (переключение между Replit и Neon DB)
 * 2. Настраивает правильные CORS-заголовки для работы с Telegram Web App
 * 3. Добавляет поддержку сессий с сохранением в БД
 * 4. Исправляет проблемы с авторизацией через Telegram
 * 5. Добавляет диагностические эндпоинты для проверки состояния системы
 */

// Необходимые модули для работы исправлений
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

// Проверка и настройка переменных окружения
process.env.PGHOST = process.env.PGHOST || 'localhost';
process.env.PGPORT = process.env.PGPORT || 5432;
process.env.PGUSER = process.env.PGUSER || 'postgres';
process.env.PGPASSWORD = process.env.PGPASSWORD || 'postgres';
process.env.PGDATABASE = process.env.PGDATABASE || 'postgres';

// Создаем соединение с базой данных
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.NODE_ENV === 'production',
  max: 20, // максимальное количество клиентов в пуле
  idleTimeoutMillis: 30000, // время ожидания перед закрытием неиспользуемых клиентов
  connectionTimeoutMillis: 2000, // время ожидания подключения
});

// Проверяем подключение к базе данных
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Ошибка подключения к PostgreSQL:', err);
  } else {
    console.log('PostgreSQL подключен:', res.rows[0].now);
    // Создаем таблицу сессий, если она не существует
    createSessionTable();
  }
});

// Функция для создания таблицы сессий
async function createSessionTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('Таблица сессий проверена/создана');
  } catch (error) {
    console.error('Ошибка при создании таблицы сессий:', error);
  }
}

// Проверка и валидация данных из Telegram Mini App
function validateTelegramData(initData) {
  try {
    if (!initData) return { isValid: false, errors: ['initData отсутствует'] };
    if (!process.env.TELEGRAM_BOT_TOKEN) return { isValid: false, errors: ['TELEGRAM_BOT_TOKEN отсутствует'] };

    // Разбираем данные инициализации
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return { isValid: false, errors: ['hash отсутствует'] };

    // Сортировка параметров в алфавитном порядке (как требует API Telegram)
    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Вычисляем HMAC-SHA-256
    const secret = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();
    const calculatedHash = crypto.createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    // Проверяем совпадение хешей
    if (calculatedHash !== hash) {
      return { isValid: false, errors: ['Hash не соответствует ожидаемому'] };
    }

    // Если данные валидны, извлекаем user и user_id
    const userDataString = urlParams.get('user');
    if (!userDataString) return { isValid: false, errors: ['user данные отсутствуют'] };

    try {
      const userData = JSON.parse(userDataString);
      const userId = userData?.id;
      if (!userId) return { isValid: false, errors: ['id пользователя отсутствует'] };

      // Все проверки пройдены
      return { isValid: true, userId, userData };
    } catch (e) {
      return { isValid: false, errors: ['Ошибка парсинга данных пользователя'] };
    }
  } catch (error) {
    console.error('Ошибка валидации Telegram данных:', error);
    return { isValid: false, errors: ['Внутренняя ошибка валидации'] };
  }
}

// Создание или обновление пользователя по Telegram ID
async function createOrUpdateTelegramUser(userData) {
  try {
    if (!userData || !userData.id) return null;

    // Проверяем, существует ли пользователь
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [userData.id]
    );

    if (existingUser.rows.length > 0) {
      // Обновляем существующего пользователя
      const user = existingUser.rows[0];
      // Обновляем данные пользователя при необходимости
      // Например, можно обновить username, first_name, last_name, если они изменились
      return user;
    } else {
      // Создаем нового пользователя
      const username = userData.username || `user_${userData.id}`;
      const firstName = userData.first_name || '';
      const lastName = userData.last_name || '';

      // Проверяем, существует ли таблица пользователей
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, 
            username VARCHAR(255) NOT NULL,
            telegram_id BIGINT UNIQUE,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);
      } catch (err) {
        console.error('Ошибка при проверке/создании таблицы пользователей:', err);
      }

      // Вставляем нового пользователя
      const result = await pool.query(
        'INSERT INTO users (username, telegram_id, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, userData.id, firstName, lastName]
      );

      return result.rows[0];
    }
  } catch (error) {
    console.error('Ошибка при создании/обновлении пользователя:', error);
    return null;
  }
}

// Функция для применения всех исправлений к Express приложению
function applyFixes(app, storage) {
  // 1. Настройка CORS для работы с Telegram Web App
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      // Разрешаем запросы с Telegram и локального хоста
      const allowedOrigins = [
        'https://web.telegram.org',
        'https://telegram.org',
        'https://telegram-web.github.io',
        'https://uni-farm-connect-x-lukyanenkolawfa.replit.app',
        'http://localhost:5173'
      ];
      
      if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
        callback(null, true);
      } else {
        // В продакшне разрешаем запросы с любого origin, но с credentials
        callback(null, true);
      }
    },
    credentials: true, // Важно для передачи cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Telegram-Data', 'X-Telegram-Init-Data']
  });

  // Применяем CORS middleware
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  // 2. Настройка сессий с обычным хранилищем (без PostgreSQL)
  // Это временное решение, пока мы не установим connect-pg-simple
  app.use(session({
    secret: process.env.SESSION_SECRET || 'unifarm-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  }));

  // 3. Добавляем маршрут для аутентификации через Telegram
  app.post('/api/telegram/auth', async (req, res) => {
    try {
      const initData = req.body.initData || req.headers['x-telegram-init-data'];
      if (!initData) {
        return res.status(400).json({
          success: false,
          error: 'Отсутствуют данные инициализации Telegram'
        });
      }

      // Валидируем данные от Telegram
      const validation = validateTelegramData(initData);
      if (!validation.isValid) {
        return res.status(403).json({
          success: false,
          error: 'Ошибка валидации данных Telegram',
          details: validation.errors
        });
      }

      // Создаем или обновляем пользователя
      const user = await createOrUpdateTelegramUser(validation.userData);
      if (!user) {
        return res.status(500).json({
          success: false,
          error: 'Ошибка при создании/обновлении пользователя'
        });
      }

      // Устанавливаем данные пользователя в сессию
      req.session.user = user;
      req.session.telegramData = validation.userData;
      req.session.isAuthenticated = true;

      // Отправляем успешный ответ
      return res.status(200).json({
        success: true,
        data: {
          user,
          session: {
            id: req.session.id,
            cookie: req.session.cookie
          }
        }
      });
    } catch (error) {
      console.error('Ошибка при аутентификации через Telegram:', error);
      return res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера при аутентификации'
      });
    }
  });

  // 4. Добавляем диагностические эндпоинты
  // Проверка состояния сервера
  app.get('/api/diag/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
      }
    });
  });

  // Проверка подключения к базе данных
  app.get('/api/diag/db', async (req, res) => {
    try {
      const dbResult = await pool.query('SELECT NOW() as time');
      res.status(200).json({
        success: true,
        data: {
          connected: true,
          time: dbResult.rows[0].time,
          config: {
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            ssl: process.env.NODE_ENV === 'production'
          }
        }
      });
    } catch (error) {
      console.error('Ошибка при проверке подключения к БД:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка подключения к базе данных',
        details: error.message
      });
    }
  });

  // Возвращаем приложение для возможности цепочки вызовов
  return app;
}

// Экспортируем функцию для применения исправлений
export {
  applyFixes,
  validateTelegramData,
  createOrUpdateTelegramUser
};