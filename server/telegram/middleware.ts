/**
 * Middleware для обработки данных от Telegram Mini App
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Расширяем интерфейс Request для добавления свойства telegram
declare global {
  namespace Express {
    interface Request {
      telegram?: {
        user?: any;
        initData?: string;
        validated?: boolean;
      };
    }
  }
}

/**
 * Валидирует initData от Telegram WebApp
 */
function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) return false;

    // Удаляем hash из параметров для проверки
    urlParams.delete('hash');

    // Сортируем параметры и создаем строку для проверки
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
    console.error('[Telegram Validation] Ошибка валидации:', error);
    return false;
  }
}

/**
 * Middleware для обработки и валидации данных от Telegram Mini App
 */
export const telegramMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Получаем initData из различных источников
  let initData = req.headers['x-telegram-init-data'] || 
                 req.headers['telegram-init-data'] || 
                 req.body?.initData ||
                 req.query?.initData;

  // Также проверяем в URL параметрах (для GET запросов)
  if (!initData && req.url.includes('tgWebAppData=')) {
    try {
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      initData = urlParams.get('tgWebAppData');
    } catch (e) {
      console.log('[Telegram Middleware] Не удалось извлечь initData из URL');
    }
  }

  if (!initData) {
    console.log('[Telegram Middleware] initData не найден в запросе');
    req.telegram = { validated: false };
    return next();
  }

  try {
    console.log('[Telegram Middleware] Обработка initData:', typeof initData, initData.toString().substring(0, 100));

    // Декодируем если нужно
    let decodedInitData = typeof initData === 'string' ? initData : initData.toString();
    if (decodedInitData.includes('%')) {
      decodedInitData = decodeURIComponent(decodedInitData);
    }

    // Валидируем initData если есть bot token
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let isValid = true;

    if (botToken && process.env.VALIDATE_TELEGRAM_DATA !== 'false') {
      isValid = validateTelegramInitData(decodedInitData, botToken);
      console.log('[Telegram Middleware] Валидация initData:', isValid);
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

      req.telegram = {
        user: userData,
        initData: decodedInitData,
        validated: isValid
      };

      console.log('[Telegram Middleware] Пользователь извлечен:', {
        id: userData.id,
        username: userData.username,
        first_name: userData.first_name,
        start_param: startParam,
        validated: isValid
      });

      // Автоматически создаем/обновляем пользователя в базе
      await createOrUpdateTelegramUser(userData, startParam);

    } else {
      console.log('[Telegram Middleware] Параметр user не найден в initData');
      req.telegram = { validated: false };
    }
  } catch (error) {
    console.error('[Telegram Middleware] Ошибка обработки initData:', error);
    req.telegram = { validated: false };
  }

  next();
};

/**
 * Создает или обновляет пользователя из Telegram данных
 */
async function createOrUpdateTelegramUser(userData: any, startParam?: string): Promise<void> {
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
    const existingUser = await pool.query(
      'SELECT id, ref_code FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (existingUser.rows.length > 0) {
      // Обновляем существующего пользователя
      await pool.query(
        'UPDATE users SET username = $1, first_name = $2, last_name = $3, updated_at = NOW() WHERE telegram_id = $4',
        [username, firstName, lastName, telegramId]
      );
      console.log('[Telegram User] Пользователь обновлен:', telegramId);
    } else {
      // Создаем нового пользователя
      const refCode = generateRefCode();
      const refBy = startParam || null; // startParam содержит реферальный код

      await pool.query(`
        INSERT INTO users (
          telegram_id, username, first_name, last_name, ref_code, ref_by,
          uni_balance, ton_balance, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        telegramId, username, firstName, lastName, refCode, refBy,
        1000.0, // Начальный баланс UNI
        0.1     // Начальный баланс TON
      ]);

      console.log('[Telegram User] Новый пользователь создан:', {
        telegram_id: telegramId,
        username,
        ref_code: refCode,
        ref_by: refBy
      });
    }

    await pool.end();
  } catch (error) {
    console.error('[Telegram User] Ошибка создания/обновления пользователя:', error);
  }
}

/**
 * Генерирует уникальный реферальный код
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
 * Middleware для проверки аутентификации через Telegram
 */
export const requireTelegramAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.telegram?.user) {
    return res.status(401).json({
      success: false,
      error: 'Требуется аутентификация через Telegram',
      need_telegram_auth: true
    });
  }

  // Добавляем telegram_id в заголовки для удобства
  req.headers['x-telegram-user-id'] = req.telegram.user.id.toString();
  req.headers['x-telegram-username'] = req.telegram.user.username || '';

  next();
};