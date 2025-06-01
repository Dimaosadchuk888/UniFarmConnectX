import type { Request, Response } from 'express';
import { MissionsService } from './service';

const missionsService = new MissionsService();

export class MissionsController {
  async getActiveMissions(req: Request, res: Response) {
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

      // Используем сервис для получения активных миссий
      const missions = await missionsService.getActiveMissionsByTelegramId(
        telegramUser.telegram_id.toString()
      );

      console.log('[Missions] Получены миссии для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        missions_count: missions.length
      });

      res.json({
        success: true,
        data: missions
      });

    } catch (error: any) {
      console.error('[Missions] Ошибка получения миссий:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения активных миссий',
        details: error.message
      });
    }
  }

  async completeMission(req: Request, res: Response) {
    try {
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { missionId } = req.body;
      
      const result = await missionsService.completeMission(
        telegramUser.id.toString(),
        missionId
      );

      res.json({
        success: true,
        data: { completed: result }
      });

    } catch (error: any) {
      console.error('[Missions] Ошибка завершения миссии:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка завершения миссии',
        details: error.message
      });
    }
  }

  async claimReward(req: Request, res: Response) {
    try {
      const telegramUser = (req as any).telegram?.user;
      const isValidated = (req as any).telegram?.validated;
      
      if (!telegramUser || !isValidated) {
        return res.status(401).json({
          success: false,
          error: 'Требуется авторизация через Telegram Mini App'
        });
      }

      const { missionId } = req.body;
      
      const result = await missionsService.claimMissionReward(
        telegramUser.id.toString(),
        missionId
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('[Missions] Ошибка получения награды:', error);
      res.status(500).json({
        success: false,
        error: 'Ошибка получения награды за миссию',
        details: error.message
      });
    }
  }
}