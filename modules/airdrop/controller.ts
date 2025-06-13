import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { AirdropService } from './service';
import { logger } from '../../core/logger';

const airdropService = new AirdropService();

export class AirdropController extends BaseController {
  async registerForAirdrop(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const { telegram_id } = req.body;
      
      // Validate telegram_id parameter
      if (!telegram_id) {
        return this.sendError(res, 'Требуется telegram_id', 400);
      }

      // Ensure the telegram_id matches the authenticated user
      if (telegram_id !== telegram.user.id) {
        return this.sendError(res, 'Недостаточно прав для регистрации', 403);
      }

      const result = await airdropService.registerForAirdrop(telegram_id);

      if (!result.success) {
        return this.sendError(res, result.message, result.code || 400);
      }

      logger.info('[Airdrop] Пользователь зарегистрирован в airdrop', {
        telegram_id: telegram_id,
        status: 'registered'
      });

      this.sendSuccess(res, {
        registered: true,
        message: result.message,
        telegram_id: telegram_id
      });
    }, 'регистрации в airdrop');
  }
}