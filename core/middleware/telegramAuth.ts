import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Middleware для перевірки Telegram авторизації
 */
export function requireTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Development auth bypass - проверяем наличие специального заголовка для Replit preview
    const isReplitPreview = req.headers.host && req.headers.host.includes('replit.dev');
    const hasDevHeader = req.headers['x-dev-mode'] === 'true';
    
    if (isReplitPreview || hasDevHeader) {
      console.log('[TelegramAuth] Development bypass active for Replit preview');
      // Правильные значения для demo_user из базы данных
      const demoUser = {
        id: 43,  // Это telegram_id в контексте Telegram
        telegram_id: 43,  // Дублируем для ясности
        username: 'demo_user',
        first_name: 'Demo User',
        ref_code: 'REF_1750952576614_t938vs'  // Актуальный ref_code из БД
      };
      (req as any).telegramUser = demoUser;
      (req as any).user = demoUser;
      (req as any).telegram = {
        user: demoUser,
        validated: true
      };
      next();
      return;
    }

    const telegramUser = (req as any).telegramUser;
    const guestId = req.headers['x-guest-id'] as string;
    const authHeader = req.headers.authorization;
    
    // Check for JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('[TelegramAuth] JWT token found, attempting verification');
      try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
        const decoded = jwt.verify(token, jwtSecret) as any;
        console.log('[TelegramAuth] JWT decoded:', decoded);
        
        if (decoded.telegram_id || decoded.telegramId) {
          // Valid JWT token - set user data and continue
          const telegram_id = decoded.telegram_id || decoded.telegramId;
          console.log('[TelegramAuth] Setting user data from JWT, telegram_id:', telegram_id);
          (req as any).telegramUser = {
            id: telegram_id,
            username: decoded.username || 'user',
            first_name: decoded.first_name || 'User',
            ref_code: decoded.ref_code || decoded.refCode
          };
          // Также устанавливаем req.user для совместимости с контроллерами
          (req as any).user = {
            id: telegram_id,
            telegram_id: telegram_id,
            username: decoded.username || 'user',
            ref_code: decoded.ref_code || decoded.refCode
          };
          next();
          return;
        }
      } catch (jwtError) {
        // JWT token invalid, continue to other auth methods
        console.log('[TelegramAuth] JWT verification failed:', jwtError);
      }
    }
    
    // Allow access if we have telegram user or guest ID (demo mode)
    if (!telegramUser && !guestId) {
      res.status(401).json({
        success: false,
        error: 'Требуется авторизация через Telegram Mini App',
        need_telegram_auth: true,
        debug: {
          has_telegram: !!(req as any).telegram,
          has_telegramUser: !!(req as any).telegramUser,
          has_user: !!(req as any).user,
          has_guestId: !!guestId,
          has_auth_header: !!authHeader,
          telegram_structure: (req as any).telegram ? Object.keys((req as any).telegram) : null
        }
      });
      return;
    }

    // Set user data for guest mode if no telegram user
    if (!telegramUser && guestId) {
      (req as any).telegramUser = {
        id: 43, // Demo user telegram_id that matches user ID 50 in database  
        username: 'demo_user',
        first_name: 'Demo',
        isDemoMode: true
      };
    }

    next();
  } catch (error) {
    logger.error('[TelegramAuth] Ошибка проверки авторизации', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Ошибка проверки авторизации'
    });
  }
}

/**
 * Опціональний middleware для Telegram авторизації
 */
export function optionalTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const telegramUser = (req as any).telegramUser;
    
    if (telegramUser) {
      (req as any).user = telegramUser;
    }
    
    next();
  } catch (error) {
    logger.error('[TelegramAuth] Ошибка опциональной авторизации', { error: error instanceof Error ? error.message : String(error) });
    next();
  }
}