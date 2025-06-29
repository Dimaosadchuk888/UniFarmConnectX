import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Middleware для перевірки Telegram авторизації
 */
export function requireTelegramAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Production auth bypass disabled for security
    // Only enable for development/testing with explicit BYPASS_AUTH=true
    if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
      console.log('[TelegramAuth] Development bypass active (disabled in production)');
      const demoUser = {
        id: 43,
        telegram_id: 42,
        username: 'demo_user',
        first_name: 'Demo User',
        ref_code: 'REF_1750426242319_8c6olz'
      };
      (req as any).telegramUser = demoUser;
      (req as any).user = demoUser;
      next();
      return;
    }

    const telegramUser = (req as any).telegramUser;
    const guestId = req.headers['x-guest-id'] as string;
    const authHeader = req.headers.authorization;
    
    // Check for JWT token first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        if (decoded.telegram_id) {
          // Valid JWT token - set user data and continue
          (req as any).telegramUser = {
            id: decoded.telegram_id,
            username: decoded.username || 'user',
            first_name: decoded.first_name || 'User',
            ref_code: decoded.ref_code
          };
          // Также устанавливаем req.user для совместимости с контроллерами
          (req as any).user = {
            id: decoded.telegram_id,
            telegram_id: decoded.telegram_id,
            username: decoded.username || 'user',
            ref_code: decoded.ref_code
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
        id: 777777777, // Demo user ID
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