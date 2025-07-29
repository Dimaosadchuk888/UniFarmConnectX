import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../logger';

/**
 * Middleware для перевірки Telegram авторизації
 */
export async function requireTelegramAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  console.log(`[requireTelegramAuth] Processing ${req.method} ${req.path}`);
  console.log(`[requireTelegramAuth] Has Authorization: ${!!req.headers.authorization}`);
  
  try {
    console.log('[TelegramAuth] === START MIDDLEWARE ===');
    console.log('[TelegramAuth] Method:', req.method, 'Path:', req.path);
    console.log('[TelegramAuth] Host:', req.headers.host);
    console.log('[TelegramAuth] Auth header present:', !!req.headers.authorization);
    console.log('[TelegramAuth] Auth header value:', req.headers.authorization?.substring(0, 50) + '...');
    
    // Проверяем JWT токен для всех режимов
    const authHeader = req.headers.authorization;
    const hasDevHeader = req.headers['x-dev-mode'] === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log('[TelegramAuth] Auth check - Production:', isProduction, 'Auth header:', !!authHeader, 'Dev header:', hasDevHeader);
    
    // Всегда проверяем JWT токен, если он есть
    console.log('[TelegramAuth] Before JWT check - authHeader:', authHeader?.substring(0, 30));
    console.log('[TelegramAuth] Starts with Bearer?', authHeader?.startsWith('Bearer '));
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      console.log('[TelegramAuth] Processing JWT token - INSIDE IF BLOCK');
      const token = authHeader.substring(7);
      console.log('[TelegramAuth] Token preview:', token.substring(0, 20) + '...');
      console.log('[TelegramAuth] About to enter try block for JWT verification');
      try {
          console.log('[TelegramAuth] Inside try block - using jsonwebtoken');
          const jwtSecret = process.env.JWT_SECRET;
          console.log('[TelegramAuth] JWT_SECRET exists:', !!jwtSecret);
          console.log('[TelegramAuth] JWT_SECRET preview:', jwtSecret ? jwtSecret.substring(0, 10) + '...' : 'NOT SET');
          if (!jwtSecret) {
            console.log('[TelegramAuth] JWT_SECRET is missing!');
            throw new Error('JWT_SECRET environment variable not set');
          }
          const decoded = jwt.verify(token, jwtSecret) as any;
          console.log('[TelegramAuth] JWT decoded for preview:', decoded);
          
          // Используем данные из JWT токена и подгружаем полные данные из базы
          const userId = decoded.userId || decoded.user_id;
          const telegramId = decoded.telegram_id || decoded.telegramId;
          
          // Подгружаем полные данные пользователя из базы данных
          try {
            const { SupabaseUserRepository } = await import('../../modules/user/service.js');
            const userRepository = new SupabaseUserRepository();
            
            // Ищем пользователя по telegram_id из JWT токена
            console.log('[TelegramAuth] Searching for user with telegram_id:', telegramId);
            console.log('[TelegramAuth] Type of telegram_id:', typeof telegramId);
            const fullUser = await userRepository.getUserByTelegramId(telegramId);
            
            if (fullUser) {
              console.log('[TelegramAuth] Loaded full user data from database:', {
                id: fullUser.id,
                telegram_id: fullUser.telegram_id,
                balance_uni: fullUser.balance_uni,
                balance_ton: fullUser.balance_ton
              });
              
              // ВАЖНО: Архитектурная проблема - поле id содержит database user ID, а не telegram_id!
              // В контроллерах используйте:
              // - telegram.user.telegram_id для получения telegram_id
              // - telegram.user.id для получения database user ID
              // Не путайте эти поля! См. TELEGRAM_AUTH_ARCHITECTURE_INVESTIGATION.md
              const user = {
                id: fullUser.id,  // Это database user ID!
                telegram_id: fullUser.telegram_id,  // Это настоящий telegram_id
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
          
          // Если пользователь не найден в базе - JWT невалиден
          console.log('[TelegramAuth] User not found in database for telegram_id:', telegramId);
          res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            need_jwt_token: true 
          });
          return;
        } catch (jwtError: any) {
          console.log('[TelegramAuth] JWT verification failed:', jwtError.message);
          console.log('[TelegramAuth] Full error:', jwtError);
          
          // Проверяем тип ошибки JWT
          let errorMessage = 'Authentication required';
          let needJwtToken = true;
          
          if (jwtError.name === 'TokenExpiredError') {
            errorMessage = 'JWT token expired';
            needJwtToken = true;
          } else if (jwtError.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid JWT token';
            needJwtToken = true;
          } else {
            errorMessage = 'Authentication required';
            needJwtToken = true;
          }
          
          // Возвращаем стандартную ошибку для фронтенда
          res.status(401).json({ 
            success: false, 
            error: errorMessage,
            need_jwt_token: needJwtToken 
          });
          return;
        }
    }
    
    // Если JWT токен отсутствует, требуем аутентификацию во всех режимах
    if (!authHeader) {
      console.log('[TelegramAuth] No auth header provided');
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        need_jwt_token: true 
      });
      return;
    }
    
    // Если мы дошли до этой точки, значит JWT токен был предоставлен, но невалиден
    console.log('[TelegramAuth] JWT token provided but invalid');
    res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      need_jwt_token: true 
    });
    return;

    // Если мы не обработали JWT токен выше, проверяем дополнительные методы авторизации
    const telegramUser = (req as any).telegramUser;
    const guestId = req.headers['x-guest-id'] as string;
    
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