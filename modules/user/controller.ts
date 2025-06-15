import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { UserService } from './service';
import { logger } from '../../core/logger';

const userService = new UserService();

export class UserController extends BaseController {
  async createUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { telegram_id, username, refCode } = req.body;
      
      if (!telegram_id) {
        return this.sendError(res, 'telegram_id is required', 400);
      }

      const result = await userService.createUser({
        telegram_id: telegram_id,
        username: username || null,
        parent_ref_code: refCode || null
      });

      this.sendSuccess(res, { user_id: result.id });
    }, 'создания пользователя');
  }



  async getCurrentUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      // Пытаемся получить пользователя через JWT токен из Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
          const jwt = await import('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
          
          if (decoded.telegram_id) {
            const user = await userService.getUserByTelegramId(decoded.telegram_id);
            if (user) {
              logger.info('[GetMe] Пользователь найден через JWT', {
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
      const user = await userService.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.id,
        username: telegramUser.user.username,
        ref_code: req.query.start_param as string // Реферальный код из query параметров
      });
      
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
        parent_ref_code: user.parent_ref_code,
        uni_balance: user.balance_uni || "0",
        ton_balance: user.balance_ton || "0",
        balance_uni: user.balance_uni || "0",
        balance_ton: user.balance_ton || "0",
        created_at: user.created_at?.toISOString(),
        is_telegram_user: true,
        auth_method: 'telegram'
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
      
      const result = await userService.updateUser(id, updates);
      this.sendSuccess(res, result || {});
    }, 'обновления пользователя');
  }

  async generateRefCode(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;

      // Используем getOrCreateUserFromTelegram для гарантированной регистрации
      const user = await userService.getOrCreateUserFromTelegram({
        telegram_id: telegramUser.user.id,
        username: telegramUser.user.username,
        ref_code: req.query.start_param as string
      });
      
      if (user.ref_code) {
        return this.sendSuccess(res, {
          ref_code: user.ref_code,
          already_exists: true
        });
      }

      const refCode = await userService.generateRefCode(user.id.toString());
      
      this.sendSuccess(res, {
        ref_code: refCode,
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
        const user = await userService.findUserByTelegramId(decoded.telegram_id);
        
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
        const updatedUser = await userService.updateUserRefCode(user.id, refCode);
        
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