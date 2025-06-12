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
      
      // If no user_id provided, return default farming status
      if (!userId) {
        const defaultFarmingData = {
          isActive: false,
          depositAmount: '0',
          ratePerSecond: '0',
          totalRatePerSecond: '0',
          depositCount: 0,
          totalDepositAmount: '0',
          dailyIncomeUni: '0',
          startDate: null,
          lastUpdate: null
        };
        
        console.log('[Farming] Возвращаем базовые данные фарминга (без user_id)');
        return this.sendSuccess(res, defaultFarmingData);
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