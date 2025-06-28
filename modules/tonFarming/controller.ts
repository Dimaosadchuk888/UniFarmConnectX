import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { TonFarmingService } from './service';
import { logger } from '../../core/logger';

const tonFarmingService = new TonFarmingService();

export class TonFarmingController extends BaseController {
  async getTonFarmingData(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const farmingData = await tonFarmingService.getTonFarmingDataByTelegramId(
        telegram.user.id.toString()
      );

      logger.info('[TON Farming] Данные TON фарминга для пользователя', {
        telegram_id: telegram.user.id,
        balance_ton: farmingData.balance_ton,
        ton_farming_rate: farmingData.ton_farming_rate,
        is_active: farmingData.is_active
      });

      this.sendSuccess(res, farmingData);
    }, 'получения данных TON фарминга');
    } catch (error) {
      next(error);
    }
  }

  async startTonFarming(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  async claimTonFarming(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await tonFarmingService.claimTonRewards(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, result);
    }, 'сбора TON фарминга');
    } catch (error) {
      next(error);
    }
  }

  async getTonFarmingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const status = await tonFarmingService.getTonFarmingStatus(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, status);
    }, 'получения статуса TON фарминга');
    } catch (error) {
      next(error);
    }
  }
}