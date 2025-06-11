import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramInitData {
  user: TelegramUser;
  auth_date: string;
  hash: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      telegram?: {
        user: TelegramUser;
        validated: boolean;
        raw: TelegramInitData;
      };
      telegramUser?: TelegramUser;
    }
  }
}

/**
 * Validates Telegram initData using HMAC-SHA256
 */
function validateTelegramInitData(initData: string, botToken: string): TelegramInitData | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return null;

    urlParams.delete('hash');
    
    // Sort parameters and create verification string
    const sortedParams = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Verify signature
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(sortedParams)
      .digest('hex');

    if (expectedHash !== hash) return null;

    // Parse data
    const data: any = {};
    for (const [key, value] of urlParams.entries()) {
      if (key === 'user') {
        data[key] = JSON.parse(value);
      } else {
        data[key] = value;
      }
    }

    return { ...data, hash };
  } catch (error) {
    console.error('[TelegramMiddleware] Validation error:', error);
    return null;
  }
}

/**
 * Middleware that parses and validates Telegram init data
 */
export function telegramMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check for Telegram init data in headers
    const initData = req.get('x-telegram-init-data') || 
                     req.get('telegram-init-data') || 
                     req.body?.initData;
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData) {
      // No init data - continue without Telegram user
      console.log('[TelegramMiddleware] No init data provided');
      next();
      return;
    }

    if (!botToken) {
      console.error('[TelegramMiddleware] Bot token not configured');
      next();
      return;
    }

    const validatedData = validateTelegramInitData(initData, botToken);
    
    if (validatedData && validatedData.user) {
      // Check auth date (not older than 1 hour)
      const authDate = parseInt(validatedData.auth_date);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime - authDate > 3600) {
        console.warn('[TelegramMiddleware] Auth data expired');
        next();
        return;
      }

      // Populate req.telegram with validated data
      req.telegram = {
        user: {
          id: validatedData.user.id,
          first_name: validatedData.user.first_name,
          last_name: validatedData.user.last_name,
          username: validatedData.user.username,
          language_code: validatedData.user.language_code,
          is_premium: validatedData.user.is_premium
        },
        validated: true,
        raw: validatedData
      };

      console.log('[TelegramMiddleware] Valid Telegram user:', {
        id: validatedData.user.id,
        username: validatedData.user.username
      });
    } else {
      console.warn('[TelegramMiddleware] Invalid init data provided');
    }

    next();
  } catch (error) {
    console.error('[TelegramMiddleware] Error processing Telegram data:', error);
    next();
  }
}

/**
 * Middleware that requires valid Telegram authentication
 */
export function requireTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  const telegram = req.telegram;
  
  if (!telegram || !telegram.validated || !telegram.user) {
    res.status(401).json({
      success: false,
      error: 'Требуется авторизация через Telegram Mini App',
      need_telegram_auth: true,
      debug: {
        has_telegram: !!telegram,
        has_user: !!telegram?.user,
        validated: telegram?.validated
      }
    });
    return;
  }

  // Add telegramUser for backward compatibility
  req.telegramUser = telegram.user;
  next();
}

/**
 * Optional Telegram auth - doesn't block if no auth present
 */
export function optionalTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  const telegram = req.telegram;
  
  if (telegram && telegram.validated && telegram.user) {
    req.telegramUser = telegram.user;
  }
  
  next();
}