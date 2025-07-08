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

  async getActiveAirdrops(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await airdropService.getActiveAirdrops();

      this.sendSuccess(res, result);
    }, 'получения активных airdrop кампаний');
  }

  async claimAirdrop(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const { airdrop_id } = req.body;
      
      if (!airdrop_id) {
        return this.sendError(res, 'Требуется airdrop_id', 400);
      }

      const result = await airdropService.claimAirdrop(telegram.user.id, airdrop_id);

      if (!result.success) {
        return this.sendError(res, result.message, result.code || 400);
      }

      this.sendSuccess(res, result);
    }, 'получения airdrop');
  }

  async getAirdropHistory(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await airdropService.getAirdropHistory(telegram.user.id);

      this.sendSuccess(res, result);
    }, 'получения истории airdrop');
  }

  async checkEligibility(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await airdropService.checkEligibility(telegram.user.id);

      this.sendSuccess(res, result);
    }, 'проверки права на airdrop');
  }
}