import type { Request, Response } from 'express';
import { FarmingService } from './service';

const farmingService = new FarmingService();

export class FarmingController {
  async getFarmingData(req: Request, res: Response) {
    try {
      // Проверяем Telegram авторизацию
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      // Используем сервис для получения данных фарминга
      const farmingData = await farmingService.getFarmingDataByTelegramId(
        telegramUser.telegram_id.toString()
      );

      console.log('[Farming] Данные фарминга для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        farming_data: farmingData
      });

      res.json({
        success: true,
        data: farmingData
      });

    } catch (error: any) {
      console.error('[Farming] Ошибка получения данных фарминга:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения данных фарминга',
        details: error.message
      });
    }
  }

  async startFarming(req: Request, res: Response) {
    try {
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { amount } = req.body;
      
      const result = await farmingService.startFarming(
        telegramUser.telegram_id.toString(),
        amount
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('[Farming] Ошибка запуска фарминга:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка запуска фарминга',
        details: error.message
      });
    }
  }

  async claimFarming(req: Request, res: Response) {
    try {
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const result = await farmingService.claimRewards(
        telegramUser.telegram_id.toString()
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('[Farming] Ошибка сбора фарминга:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка сбора фарминга',
        details: error.message
      });
    }
  }
}