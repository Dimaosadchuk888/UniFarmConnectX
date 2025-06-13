import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { TonFarmingService } from './service';
import { logger } from '../../core/logger';

const tonFarmingService = new TonFarmingService();

export class TonFarmingController extends BaseController {
  async getTonFarmingData(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const farmingData = await tonFarmingService.getTonFarmingDataByTelegramId(
        telegram.user.id.toString()
      );

      console.log('[TON Farming] Данные TON фарминга для пользователя:', {
        telegram_id: telegram.user.id,
        ton_farming_balance: farmingData.ton_farming_balance,
        ton_farming_rate: farmingData.ton_farming_rate,
        is_active: farmingData.is_active
      });

      this.sendSuccess(res, farmingData);
    }, 'получения данных TON фарминга');
  }

  async startTonFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;
      
      const { amount } = req.body;
      
      const result = await tonFarmingService.startTonFarming(
        telegram.user.id.toString(),
        amount
      );

      this.sendSuccess(res, { started: result });
    }, 'запуска TON фарминга');
  }

  async claimTonFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await tonFarmingService.claimTonRewards(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, result);
    }, 'сбора TON фарминга');
  }

  async getTonFarmingStatus(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const status = await tonFarmingService.getTonFarmingStatus(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, status);
    }, 'получения статуса TON фарминга');
  }
}