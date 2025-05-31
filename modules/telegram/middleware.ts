/**
 * Стабильный объединенный Telegram middleware
 * Консолидирует всю обработку Telegram WebApp в один надежный обработчик
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Расширение интерфейса Express Request
declare global {
  namespace Express {
    interface Request {
      telegram?: {
        user?: {
          id: number;
          username?: string;
          first_name?: string;
          last_name?: string;
          telegram_id: string;
          ref_code?: string;
          uni_balance?: number;
          ton_balance?: number;
          auth_date?: number;
          start_param?: string;
        };
        initData?: string;
        validated: boolean;
        startParam?: string;
        userId?: number;
      };
    }
  }
}

/**
 * Валидация initData от Telegram WebApp
 */
function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    // Удаляем hash для проверки
    urlParams.delete('hash');

    // Создаем строку для проверки
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    console.error('[TelegramMiddleware] Ошибка валидации initData:', error);
    return false;
  }
}

/**
 * Генерация уникального реферального кода
 */
function generateRefCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Создание или обновление пользователя Telegram в базе данных
 */
async function createOrUpdateTelegramUser(userData: any, startParam?: string): Promise<any> {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const telegramId = userData.id.toString();
    const username = userData.username || '';
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';

    // Проверяем существование пользователя
    const existingUserQuery = 'SELECT id, ref_code, uni_balance, ton_balance FROM users WHERE telegram_id = $1';
    const existingUser = await pool.query(existingUserQuery, [telegramId]);

    if (existingUser.rows.length > 0) {
      // Обновляем существующего пользователя
      const updateQuery = `
        UPDATE users 
        SET username = $1, first_name = $2, last_name = $3, updated_at = NOW() 
        WHERE telegram_id = $4
        RETURNING id, telegram_id, username, first_name, ref_code, uni_balance, ton_balance
      `;
      const result = await pool.query(updateQuery, [username, firstName, lastName, telegramId]);
      
      console.log('[TelegramMiddleware] Пользователь обновлен:', {
        telegram_id: telegramId,
        username,
        id: result.rows[0].id
      });

      await pool.end();
      return result.rows[0];
    } else {
      // Создаем нового пользователя
      const refCode = generateRefCode();
      const refBy = startParam || null;

      const insertQuery = `
        INSERT INTO users (
          telegram_id, username, first_name, last_name, ref_code, ref_by,
          uni_balance, ton_balance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, telegram_id, username, first_name, ref_code, uni_balance, ton_balance
      `;
      
      const result = await pool.query(insertQuery, [
        telegramId, username, firstName, lastName, refCode, refBy,
        1000.0, // Начальный баланс UNI
        0.1     // Начальный баланс TON
      ]);

      console.log('[TelegramMiddleware] Новый пользователь создан:', {
        telegram_id: telegramId,
        username,
        ref_code: refCode,
        ref_by: refBy,
        id: result.rows[0].id
      });

      await pool.end();
      return result.rows[0];
    }
  } catch (error) {
    console.error('[TelegramMiddleware] Ошибка работы с базой данных:', error);
    throw error;
  }
}

/**
 * Основной Telegram middleware
 */
export const telegramMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Получаем initData из различных источников
    let initData = req.headers['x-telegram-init-data'] || 
                   req.headers['telegram-init-data'] || 
                   (req.body as any)?.initData ||
                   (req.query as any)?.initData;

    // Проверяем URL параметры для GET запросов
    if (!initData && req.url.includes('tgWebAppData=')) {
      try {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        initData = urlParams.get('tgWebAppData');
      } catch (e) {
        console.log('[TelegramMiddleware] Не удалось извлечь initData из URL');
      }
    }

    if (!initData) {
      console.log('[TelegramMiddleware] initData не найден в запросе');
      req.telegram = { validated: false };
      return next();
    }

    console.log('[TelegramMiddleware] Обработка initData, длина:', 
                typeof initData === 'string' ? initData.length : 'не строка');

    // Декодируем initData если необходимо
    let decodedInitData = typeof initData === 'string' ? initData : initData.toString();
    if (decodedInitData.includes('%')) {
      decodedInitData = decodeURIComponent(decodedInitData);
    }

    // Валидируем initData
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let isValid = true;

    if (botToken && process.env.VALIDATE_TELEGRAM_DATA !== 'false') {
      isValid = validateTelegramInitData(decodedInitData, botToken);
      console.log('[TelegramMiddleware] Результат валидации initData:', isValid);
    } else {
      console.log('[TelegramMiddleware] Валидация пропущена (development режим)');
    }

    // Парсим initData
    const urlParams = new URLSearchParams(decodedInitData);
    const userParam = urlParams.get('user');
    const authDate = urlParams.get('auth_date');
    const startParam = urlParams.get('start_param');

    if (userParam) {
      let userData;
      try {
        userData = JSON.parse(decodeURIComponent(userParam));
      } catch (parseError) {
        userData = JSON.parse(userParam);
      }

      // Добавляем дополнительную информацию
      if (authDate) {
        userData.auth_date = parseInt(authDate);
      }
      if (startParam) {
        userData.start_param = startParam;
      }

      console.log('[TelegramMiddleware] Данные пользователя извлечены:', {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        start_param: startParam,
        validated: isValid
      });

      // Создаем или обновляем пользователя в базе данных
      try {
        const dbUser = await createOrUpdateTelegramUser(userData, startParam);
        
        // Подготавливаем данные пользователя для middleware
        const telegramUser = {
          id: dbUser.id,
          username: dbUser.username,
          first_name: dbUser.first_name,
          telegram_id: dbUser.telegram_id,
          ref_code: dbUser.ref_code,
          uni_balance: parseFloat(dbUser.uni_balance) || 0,
          ton_balance: parseFloat(dbUser.ton_balance) || 0,
          auth_date: userData.auth_date,
          start_param: startParam
        };

        req.telegram = {
          user: telegramUser,
          initData: decodedInitData,
          validated: isValid,
          startParam: startParam,
          userId: dbUser.id
        };

        // Добавляем заголовки для совместимости
        req.headers['x-telegram-user-id'] = dbUser.telegram_id;
        req.headers['x-telegram-username'] = dbUser.username || '';

        console.log('[TelegramMiddleware] Пользователь успешно обработан и готов к использованию:', {
          id: telegramUser.id,
          telegram_id: telegramUser.telegram_id,
          ref_code: telegramUser.ref_code
        });

      } catch (dbError) {
        console.error('[TelegramMiddleware] Ошибка работы с базой данных:', dbError);
        req.telegram = { validated: false };
      }

    } else {
      console.log('[TelegramMiddleware] Параметр user не найден в initData');
      req.telegram = { validated: false };
    }

  } catch (error) {
    console.error('[TelegramMiddleware] Критическая ошибка обработки:', error);
    req.telegram = { validated: false };
  }

  next();
};

/**
 * Middleware для проверки обязательной Telegram авторизации
 */
export const requireTelegramAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.telegram?.user || !req.telegram.validated) {
    return res.status(401).json({
      success: false,
      error: 'Требуется авторизация через Telegram',
      need_telegram_auth: true,
      debug: {
        has_telegram: !!req.telegram,
        has_user: !!req.telegram?.user,
        validated: req.telegram?.validated
      }
    });
  }

  next();
};