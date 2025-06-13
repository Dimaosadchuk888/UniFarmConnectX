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
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;
      
      logger.info('[GetMe] Запрос данных пользователя', { 
        has_telegram_user: !!telegramUser,
        telegram_id: telegramUser?.user?.id
      });
      
      const user = await userService.getUserByTelegramId(telegramUser.user.id.toString());
      
      logger.info('[GetMe] Возвращаем данные пользователя', {
        id: user?.id,
        telegram_id: user?.telegram_id,
        ref_code: user?.ref_code
      });
      
      if (!user) {
        return this.sendError(res, 'Пользователь не найден', 404);
      }
      
      this.sendSuccess(res, {
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

      const user = await userService.getUserByTelegramId(telegramUser.user.id.toString());
      
      if (!user) {
        return this.sendError(res, 'Пользователь не найден', 404);
      }
      
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
}