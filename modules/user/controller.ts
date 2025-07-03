import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { SupabaseUserRepository } from './service';
import { logger } from '../../core/logger';

const userRepository = new SupabaseUserRepository();

export class UserController extends BaseController {
  async createUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { telegram_id, username, refCode } = req.body;
      
      if (!telegram_id) {
        return this.sendError(res, 'telegram_id is required', 400);
      }

      const result = await userRepository.createUser({
        telegram_id: telegram_id,
        username: username || undefined,
        ref_by: refCode || undefined
      });

      if (result) {
        this.sendSuccess(res, { user_id: result.id });
      } else {
        this.sendError(res, 'Failed to create user', 500);
      }
    }, 'создания пользователя');
  }



  async getCurrentUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async (req: Request, res: Response) => {
      console.log('[GetMe] === НАЧАЛО ПОИСКА ПОЛЬЗОВАТЕЛЯ ===');
      console.log('[GetMe] req.user:', (req as any).user ? { id: (req as any).user.id, telegram_id: (req as any).user.telegram_id } : null);
      console.log('[GetMe] req.telegramUser:', (req as any).telegramUser ? { id: (req as any).telegramUser.id, telegram_id: (req as any).telegramUser.telegram_id } : null);
      console.log('[GetMe] Authorization header:', req.headers.authorization ? 'PRESENT' : 'MISSING');
      
      // Сначала проверяем данные пользователя из middleware
      const middlewareUser = (req as any).user || (req as any).telegramUser;
      if (middlewareUser) {
        logger.info('[GetMe] Используем данные пользователя из middleware', {
          id: middlewareUser.id,
          telegram_id: middlewareUser.telegram_id,
          ref_code: middlewareUser.ref_code
        });
        
        return this.sendSuccess(res, {
          user: {
            id: middlewareUser.id,
            telegram_id: middlewareUser.telegram_id,
            username: middlewareUser.username,
            first_name: middlewareUser.first_name,
            ref_code: middlewareUser.ref_code,
            balance_uni: middlewareUser.balance_uni || '0',
            balance_ton: middlewareUser.balance_ton || '0'
          }
        });
      }
      
      // Fallback: пытаемся получить пользователя через JWT токен из Authorization header  
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
          
          logger.info('[GetMe] Поиск пользователя по JWT', {
            userId: decoded.userId,
            telegram_id: decoded.telegram_id
          });
          
          // Попробуем найти пользователя по telegram_id (как в auth/telegram)
          if (decoded.telegram_id) {
            console.log('[GetMe] JWT decoded telegram_id:', decoded.telegram_id);
            const user = await userRepository.getUserByTelegramId(decoded.telegram_id);
            console.log('[GetMe] getUserByTelegramId result:', user ? { id: user.id, telegram_id: user.telegram_id } : null);
            
            if (user) {
              logger.info('[GetMe] Пользователь найден по telegram_id через JWT', {
                id: user.id,
                telegram_id: user.telegram_id,
                ref_code: user.ref_code,
                balance_uni: user.balance_uni,
                balance_ton: user.balance_ton
              });
              
              return this.sendSuccess(res, {
                user: {
                  id: user.id,
                  telegram_id: user.telegram_id,
                  username: user.username,
                  first_name: user.first_name,
                  ref_code: user.ref_code,
                  balance_uni: user.balance_uni,
                  balance_ton: user.balance_ton
                }
              });
            }
          }
          
          // Fallback: поиск по userId
          if (decoded.userId) {
            console.log('[GetMe] Поиск пользователя по ID:', decoded.userId);
            const user = await userRepository.getUserById(decoded.userId);
            console.log('[GetMe] getUserById результат:', user ? { id: user.id, telegram_id: user.telegram_id } : 'NOT_FOUND');
            if (user) {
              logger.info('[GetMe] Пользователь найден по userId через JWT', {
                id: user.id,
                telegram_id: user.telegram_id,
                ref_code: user.ref_code
              });
              
              return this.sendSuccess(res, {
                user: {
                  id: user.id,
                  telegram_id: user.telegram_id,
                  username: user.username,
                  ref_code: user.ref_code,
                  balance_uni: user.balance_uni,
                  balance_ton: user.balance_ton
                }
              });
            }
          }
        } catch (jwtError) {
          logger.warn('[GetMe] JWT токен недействителен', { error: jwtError });
        }
      }

      // Fallback: старая логика через Telegram
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) {
        return this.sendError(res, 'Требуется авторизация через Telegram Mini App', 401);
      }
      
      logger.info('[GetMe] Запрос данных пользователя', { 
        has_telegram_user: !!telegramUser,
        telegram_id: telegramUser?.user?.id
      });
      
      // Используем getOrCreateUserFromTelegram для гарантированной регистрации
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.id,
        username: telegramUser.user.username,
        first_name: telegramUser.user.first_name,
        ref_by: req.query.start_param as string // Реферальный код из query параметров
      });
      
      if (!user) {
        return this.sendError(res, 'Failed to create or find user', 500);
      }

      logger.info('[GetMe] Пользователь найден/создан', {
        id: user.id,
        telegram_id: user.telegram_id,
        ref_code: user.ref_code
      });
      
      this.sendSuccess(res, {
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username || telegramUser.user.first_name,
          first_name: telegramUser.user.first_name,
          ref_code: user.ref_code,
          referred_by: user.referred_by,
          uni_balance: user.balance_uni || "0",
          ton_balance: user.balance_ton || "0",
          balance_uni: user.balance_uni || "0",
          balance_ton: user.balance_ton || "0",
          created_at: user.created_at,
          is_telegram_user: true,
          auth_method: 'telegram'
        }
      });
    }, 'получения текущего пользователя');
  }

  async updateUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      if (!this.validateParams(req, ['id'])) {
        return this.sendError(res, 'Отсутствует параметр id', 400);
      }

      const { id } = req.params;
      const updates = req.body;
      
      const result = await userRepository.updateUser(parseInt(id), updates);
      this.sendSuccess(res, result || {});
    }, 'обновления пользователя');
  }

  async generateRefCode(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;

      // Используем getOrCreateUserFromTelegram для гарантированной регистрации
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.id,
        username: telegramUser.user.username,
        first_name: telegramUser.user.first_name,
        ref_by: req.query.start_param as string
      });
      
      if (!user) {
        return this.sendError(res, 'Failed to create or find user', 500);
      }
      
      if (user.ref_code) {
        return this.sendSuccess(res, {
          ref_code: user.ref_code,
          already_exists: true
        });
      }

      const updatedUser = await userRepository.updateUserRefCode(user.id);
      
      this.sendSuccess(res, {
        ref_code: updatedUser?.ref_code || user.ref_code,
        generated: true
      });
    }, 'генерации реферального кода');
  }

  /**
   * Восстановление реферального кода для существующих пользователей
   */
  async recoverRefCode(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // Извлекаем пользователя из JWT токена
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return this.sendError(res, 'Authorization token required', 401);
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
        
        if (!decoded || !decoded.telegram_id) {
          return this.sendError(res, 'Invalid token', 401);
        }

        logger.info('[RecoverRefCode] Восстановление ref_code для пользователя', {
          telegram_id: decoded.telegram_id
        });

        // Ищем пользователя по telegram_id
        const user = await userRepository.findUserByTelegramId(decoded.telegram_id);
        
        if (!user) {
          return this.sendError(res, 'User not found', 404);
        }

        // Если у пользователя уже есть ref_code, возвращаем его
        if (user.ref_code) {
          logger.info('[RecoverRefCode] Пользователь уже имеет ref_code', {
            user_id: user.id,
            ref_code: user.ref_code
          });
          
          return this.sendSuccess(res, {
            ref_code: user.ref_code,
            status: 'already_exists'
          });
        }

        // Генерируем новый ref_code
        const refCode = `REF${user.telegram_id}${Date.now()}`;
        
        // Обновляем пользователя
        const updatedUser = await userRepository.updateUserRefCode(user.id, refCode);
        
        logger.info('[RecoverRefCode] Ref_code успешно восстановлен', {
          user_id: user.id,
          telegram_id: user.telegram_id,
          ref_code: refCode
        });

        this.sendSuccess(res, {
          ref_code: refCode,
          status: 'recovered',
          user_id: user.id
        });

      } catch (jwtError) {
        logger.error('[RecoverRefCode] Ошибка JWT токена', {
          error: jwtError instanceof Error ? jwtError.message : String(jwtError)
        });
        
        return this.sendError(res, 'Invalid or expired token', 401);
      }
    }, 'восстановления реферального кода');
  }
}