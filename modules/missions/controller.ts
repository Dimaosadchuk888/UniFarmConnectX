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

  async getMissionStats(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const userId = req.query.user_id as string;
      
      // Return default stats if no user_id provided
      if (!userId) {
        const defaultStats = {
          total_missions: 0,
          completed_missions: 0,
          pending_missions: 0,
          total_rewards: '0',
          completion_rate: 0
        };
        
        console.log('[Missions] Возвращаем базовую статистику миссий (без user_id)');
        return this.sendSuccess(res, defaultStats);
      }

      const stats = await missionsService.getMissionStatsByTelegramId(userId);
      this.sendSuccess(res, stats);
    }, 'получения статистики миссий');
  }

  async getUserMissions(req: Request, res: Response) {
    await this.handleRequest(req, res, async () => {
      const userId = req.params.userId || req.query.user_id as string;
      
      if (!userId) {
        return this.sendError(res, 'user_id parameter is required', 400);
      }

      const missions = await missionsService.getUserMissionsByTelegramId(userId);
      this.sendSuccess(res, missions);
    }, 'получения миссий пользователя');
  }
}