import type { Request, Response } from 'express';
import { BaseController } from '@/core/BaseController';
import { UserService } from './service';

const userService = new UserService();

export class UserController extends BaseController {
  async createUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { guestId: bodyGuestId, refCode } = req.body;
      const headerGuestId = req.headers['x-guest-id'] as string;
      
      const guestId = bodyGuestId || headerGuestId;
      
      if (!guestId) {
        return this.sendError(res, 'guestId is required', 400);
      }

      const result = await userService.createUser({
        guest_id: guestId,
        parent_ref_code: refCode || null
      });

      this.sendSuccess(res, { user_id: result.id });
    }, 'создания пользователя');
  }

  async getUserByGuestId(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const { guest_id } = req.query;
      
      if (!guest_id || typeof guest_id !== 'string') {
        return this.sendError(res, 'guest_id query parameter is required', 400);
      }

      const user = await userService.getUserByGuestId(guest_id);
      
      if (!user) {
        return this.sendError(res, 'User not found', 404);
      }

      this.sendSuccess(res, user);
    }, 'получения пользователя по Guest ID');
  }

  async getCurrentUser(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;
      
      console.log('[GetMe] Запрос данных пользователя:', { 
        has_telegram_user: !!telegramUser,
        telegram_id: telegramUser?.telegram_id
      });
      
      const user = await userService.getUserByTelegramId(telegramUser.telegram_id.toString());
      
      console.log('[GetMe] Возвращаем данные пользователя:', {
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
        username: user.username || telegramUser.first_name,
        first_name: telegramUser.first_name,
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

      if (telegramUser.ref_code) {
        return this.sendSuccess(res, {
          ref_code: telegramUser.ref_code,
          already_exists: true
        });
      }

      const refCode = await userService.generateRefCode(telegramUser.id.toString());
      
      this.sendSuccess(res, {
        ref_code: refCode,
        generated: true
      });
    }, 'генерации реферального кода');
  }
}