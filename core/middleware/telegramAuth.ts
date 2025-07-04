import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Middleware для перевірки Telegram авторизації
 */
export async function requireTelegramAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log('[TelegramAuth] Middleware invoked for:', req.method, req.path);
    console.log('[TelegramAuth] Host:', req.headers.host);
    console.log('[TelegramAuth] Auth header present:', !!req.headers.authorization);
    
    // Development auth bypass - проверяем наличие специального заголовка для Replit preview или localhost
    const isReplitPreview = req.headers.host && (req.headers.host.includes('replit.dev') || req.headers.host.includes('localhost'));
    const hasDevHeader = req.headers['x-dev-mode'] === 'true';
    
    console.log('[TelegramAuth] Preview mode:', isReplitPreview, 'Dev header:', hasDevHeader);
    
    if (isReplitPreview || hasDevHeader) {
      console.log('[TelegramAuth] Replit Preview mode - checking JWT token');
      // В режиме preview используем JWT токен, если он есть
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const jwt = require('jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET || 'unifarm_jwt_secret_key_2025_production';
          const decoded = jwt.verify(token, jwtSecret) as any;
          console.log('[TelegramAuth] JWT decoded for preview:', decoded);
          
          // Используем данные из JWT токена и подгружаем полные данные из базы
          const userId = decoded.userId || decoded.user_id;
          const telegramId = decoded.telegram_id || decoded.telegramId;
          
          // Подгружаем полные данные пользователя из базы данных
          try {
            const { SupabaseUserRepository } = require('../../modules/user/service');
            const userRepository = new SupabaseUserRepository();
            
            // Ищем пользователя по userId из JWT токена (primary key)
            console.log('[TelegramAuth] Searching for user with userId:', userId);
            const fullUser = await userRepository.getUserById(userId);
            
            if (fullUser) {
              console.log('[TelegramAuth] Loaded full user data from database:', {
                id: fullUser.id,
                telegram_id: fullUser.telegram_id,
                balance_uni: fullUser.balance_uni,
                balance_ton: fullUser.balance_ton
              });
              
              const user = {
                id: fullUser.id,
                telegram_id: fullUser.telegram_id,
                username: fullUser.username,
                first_name: fullUser.first_name,
                ref_code: fullUser.ref_code,
                balance_uni: fullUser.balance_uni,
                balance_ton: fullUser.balance_ton
              };
              
              (req as any).telegramUser = user;
              (req as any).user = user;
              (req as any).telegram = { user, validated: true };
              next();
              return;
            }
          } catch (dbError) {
            console.log('[TelegramAuth] Failed to load user from database:', dbError);
          }
          
          // Fallback: используем только данные из JWT
          const user = {
            id: userId,
            telegram_id: telegramId,
            username: decoded.username || 'user',
            first_name: decoded.first_name || 'User',
            ref_code: decoded.ref_code || decoded.refCode
          };
          
          (req as any).telegramUser = user;
          (req as any).user = user;
          (req as any).telegram = { user, validated: true };
          next();
          return;
        } catch (jwtError) {
          console.log('[TelegramAuth] JWT verification failed in preview:', jwtError);
        }
      }
      
      // Fallback только если JWT недоступен
      console.log('[TelegramAuth] No valid JWT - using fallback auth');
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

    // Remove demo mode - require proper authentication
    if (!telegramUser) {
      // In production, user must be authenticated
      return;
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