import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthService } from '../../modules/auth/service';
// Типы для Supabase API
interface User {
  id: number;
  telegram_id: number;
  username?: string;
  ref_code: string;
  balance_uni: string;
  balance_ton: string;
}

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
    console.log('✅ validateTelegramInitData called');
    console.log('initData length:', initData.length);
    console.log('botToken available:', !!botToken);
    
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) {
      console.log('❌ No hash found in initData');
      return null;
    }

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

    console.log('Sorted params for validation:', sortedParams.substring(0, 100));

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

    console.log('Expected hash:', expectedHash);
    console.log('Received hash:', hash);

    if (expectedHash !== hash) {
      console.log('❌ Hash validation failed');
      return null;
    }

    console.log('✅ Hash validation successful');

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

    console.log('✅ Parsed Telegram data:', { user: data.user?.id, auth_date: data.auth_date });

    return { ...data, hash };
  } catch (error) {
    console.log('❌ validateTelegramInitData error:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Middleware для аутентификации через Telegram initData
 */
export function authenticateTelegram(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  console.log('✅ [TelegramMiddleware] authenticateTelegram called');
  
  const initData = req.get('x-telegram-init-data');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  console.log('initData header present:', !!initData);
  console.log('botToken available:', !!botToken);

  if (!botToken) {
    console.log('❌ [TelegramMiddleware] Bot token not configured');
    return res.status(500).json({ error: 'Telegram bot token not configured' });
  }

  if (!initData) {
    console.log('❌ [TelegramMiddleware] No initData in headers');
    
    // Проверяем, это ли прямая регистрация через тело запроса
    if (req.body?.direct_registration && req.body?.telegram_id) {
      console.log('✅ [TelegramMiddleware] Direct registration detected, bypassing initData check');
      // Создаем фиктивного пользователя для middleware
      req.user = {
        id: parseInt(req.body.telegram_id),
        telegram_id: parseInt(req.body.telegram_id),
        username: req.body.username
      };
      return next();
    }
    
    return res.status(401).json({ 
      error: 'Telegram init data required',
      debug: {
        message: 'Приложение должно быть открыто в Telegram Mini App',
        has_telegram: false,
        has_initdata: false
      }
    });
  }

  console.log('✅ [TelegramMiddleware] Validating initData...');
  const validatedData = validateTelegramInitData(initData, botToken);
  
  if (!validatedData || !validatedData.user) {
    console.log('❌ [TelegramMiddleware] Invalid initData validation');
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  console.log('✅ [TelegramMiddleware] Valid Telegram user:', validatedData.user.id);

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

  console.log('✅ JWT Middleware called, token present:', !!token);

  if (!token) {
    console.log('❌ No JWT token provided');
    return res.status(401).json({ error: 'JWT token required' });
  }

  try {
    console.log('✅ Validating JWT token...');
    const authService = new AuthService();
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      console.log('❌ JWT token validation failed - no user found');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log('✅ JWT token valid, user authenticated:', { id: user.id, telegram_id: user.telegram_id });
    
    // Конвертируем User в AuthUser для middleware
    req.user = {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      ref_code: user.ref_code
    };
    next();
  } catch (error) {
    console.error('❌ JWT validation error:', error);
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

/**
 * Alias for authenticateJWT - for backward compatibility
 */
export const requireAuth = authenticateJWT;