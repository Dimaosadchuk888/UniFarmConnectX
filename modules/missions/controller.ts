import type { Request, Response } from 'express';
import { BaseController } from '../../core/BaseController';
import { MissionsService } from './service';

const missionsService = new MissionsService();

export class MissionsController extends BaseController {
  async getActiveMissions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const missions = await missionsService.getActiveMissionsByTelegramId(
        telegram.user.id.toString()
      );

      console.log('[Missions] Получены миссии для пользователя:', {
        telegram_id: telegram.user.id,
        missions_count: missions.length
      });

      this.sendSuccess(res, missions);
    }, 'получения активных миссий');
  }

  async completeMission(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const { missionId } = req.body;
      
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.completeMission(
        telegram.user.id.toString(),
        missionId
      );

      this.sendSuccess(res, { completed: result });
    }, 'завершения миссии');
  }

  async claimReward(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      const { missionId } = req.body;
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.claimMissionReward(
        telegram.user.id.toString(),
        missionId
      );

      this.sendSuccess(res, result);
    }, 'получения награды за миссию');
  }
}