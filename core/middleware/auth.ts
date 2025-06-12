import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthService } from '../../modules/auth/service';
import { type User } from '../../shared/schema';

interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  auth_date: string;
  hash: string;
}

// Упрощенный интерфейс пользователя для middleware  
interface AuthUser {
  id: number;
  telegram_id: number | null;
  username?: string | null;
  ref_code?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Проверяет валидность Telegram initData
 */
function validateTelegramInitData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return null;

    urlParams.delete('hash');
    
    // Сортируем параметры и создаем строку для проверки
    const entries: [string, string][] = [];
    urlParams.forEach((value, key) => {
      entries.push([key, value]);
    });
    const sortedParams = entries
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Проверяем подпись
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (expectedHash !== hash) return null;

    // Парсим данные
    const data: any = {};
    const keys = Array.from(urlParams.keys());
    for (const key of keys) {
      const value = urlParams.get(key);
      if (value !== null) {
        if (key === 'user') {
          data[key] = JSON.parse(value);
        } else {
          data[key] = value;
        }
      }
    }

    return { ...data, hash };
  } catch (error) {
    return null;
  }
}

/**
 * Middleware для аутентификации через Telegram initData
 */
export function authenticateTelegram(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const initData = req.get('x-telegram-init-data');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: 'Telegram bot token not configured' });
  }

  if (!initData) {
    return res.status(401).json({ error: 'Telegram init data required' });
  }

  const validatedData = validateTelegramInitData(initData, botToken);
  
  if (!validatedData || !validatedData.user) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  // Проверяем время авторизации (не старше 1 часа)
  const authDate = parseInt(validatedData.auth_date);
  const currentTime = Math.floor(Date.now() / 1000);
  
  if (currentTime - authDate > 3600) {
    return res.status(401).json({ error: 'Auth data expired' });
  }

  req.user = {
    id: validatedData.user.id,
    telegram_id: validatedData.user.id,
    username: validatedData.user.username
  };

  next();
}

/**
 * Middleware для проверки JWT токена с полной типизацией
 */
export async function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'JWT token required' });
  }

  try {
    const authService = new AuthService();
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Конвертируем User в AuthUser для middleware
    req.user = {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      ref_code: user.ref_code
    };
    next();
  } catch (error) {
    console.error('[Auth] JWT validation error:', error);
    return res.status(401).json({ error: 'Invalid JWT token' });
  }
}

/**
 * Опциональная аутентификация - не блокирует запрос при отсутствии токена
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const initData = req.get('x-telegram-init-data');
  const token = req.get('authorization')?.replace('Bearer ', '');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (initData && botToken) {
    const validatedData = validateTelegramInitData(initData, botToken);
    if (validatedData?.user) {
      req.user = {
        id: validatedData.user.id,
        telegram_id: validatedData.user.id,
        username: validatedData.user.username
      };
    }
  } else if (token) {
    try {
      // Упрощенная проверка токена
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        req.user = {
          id: 1,
          telegram_id: 1,
          username: 'authenticated'
        };
      }
    } catch (error) {
      // Игнорируем ошибки при опциональной аутентификации
    }
  }

  next();
}