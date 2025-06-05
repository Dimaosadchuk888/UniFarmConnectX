import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { MissionsService } from './service';

const missionsService = new MissionsService();

export class MissionsController extends BaseController {
  async getActiveMissions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.getTelegramUser(req);

      const missions = await missionsService.getActiveMissionsByTelegramId(
        telegramUser.telegram_id.toString()
      );

      console.log('[Missions] Получены миссии для пользователя:', {
        telegram_id: telegramUser.telegram_id,
        missions_count: missions.length
      });

      this.sendSuccess(res, missions);
    }, 'получения активных миссий');
  }

  async completeMission(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.getTelegramUser(req);
      const { missionId } = req.body;
      
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.completeMission(
        telegramUser.id.toString(),
        missionId
      );

      this.sendSuccess(res, { completed: result });
    }, 'завершения миссии');
  }

  async claimReward(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegramUser = this.validateTelegramAuth(req, res);
      if (!telegramUser) return;

      const { missionId } = req.body;
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.claimMissionReward(
        telegramUser.id.toString(),
        missionId
      );

      this.sendSuccess(res, result);
    }, 'получения награды за миссию');
  }
}