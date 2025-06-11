import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { FarmingService } from './service';

const farmingService = new FarmingService();

export class FarmingController extends BaseController {
  async getFarmingData(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен
      
      const farmingData = await farmingService.getFarmingDataByTelegramId(
        telegram.user.id.toString()
      );

      console.log('[Farming] Данные фарминга для пользователя:', {
        telegram_id: telegram.user.id,
        farming_data: farmingData
      });

      this.sendSuccess(res, farmingData);
    }, 'получения данных фарминга');
  }

  async getFarmingInfo(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const userId = req.query.user_id as string;
      
      if (!userId) {
        return this.sendError(res, 'user_id parameter is required', 400);
      }

      const farmingData = await farmingService.getFarmingDataByTelegramId(userId);

      console.log('[Farming] Информация о фарминге для пользователя:', {
        user_id: userId,
        farming_info: farmingData
      });

      this.sendSuccess(res, farmingData);
    }, 'получения информации о фарминге');
  }

  async startFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;
      
      const { amount } = req.body;
      
      const result = await farmingService.startFarming(
        telegram.user.id.toString(),
        amount
      );

      this.sendSuccess(res, { started: result });
    }, 'запуска фарминга');
  }

  async claimFarming(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return;

      const result = await farmingService.claimRewards(
        telegram.user.id.toString()
      );

      this.sendSuccess(res, result);
    }, 'сбора фарминга');
  }
}