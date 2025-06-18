import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { MissionsService } from './service';
import { SupabaseUserRepository } from '../user/service';
import { logger } from '../../core/logger';

const missionsService = new MissionsService();
const userRepository = new SupabaseUserRepository();

export class MissionsController extends BaseController {
  async getActiveMissions(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const missions = await missionsService.getActiveMissionsByTelegramId(
        telegram.user.id.toString()
      );

      logger.info('[Missions] Получены миссии для пользователя', {
        telegram_id: telegram.user.id,
        missions_count: missions.length
      });

      this.sendSuccess(res, missions);
    }, 'получения активных миссий');
    } catch (error) {
      next(error);
    }
  }

  async completeMission(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const { missionId } = req.body;
      
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.completeMission(
        telegram.user.id.toString(),
        missionId
      );

      this.sendSuccess(res, { completed: result });
    }, 'завершения миссии');
    } catch (error) {
      next(error);
    }
  }

  async claimReward(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const { missionId } = req.body;
      this.validateRequiredFields(req.body, ['missionId']);
      
      const result = await missionsService.claimMissionReward(
        telegram.user.id.toString(),
        missionId
      );

      this.sendSuccess(res, result);
    }, 'получения награды за миссию');
    } catch (error) {
      next(error);
    }
  }

  async getMissionStats(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const stats = await missionsService.getMissionStatsByTelegramId(telegram.user.id.toString());
      this.sendSuccess(res, stats);
    }, 'получения статистики миссий');
    } catch (error) {
      next(error);
    }
  }

  async getUserMissions(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegram = this.validateTelegramAuth(req, res);
      if (!telegram) return; // 401 уже отправлен

      // Автоматическая регистрация пользователя
      const user = await userRepository.getOrCreateUserFromTelegram({
        telegram_id: telegram.user.id,
        username: telegram.user.username,
        first_name: telegram.user.first_name,
        ref_by: req.query.start_param as string
      });

      const missions = await missionsService.getUserMissionsByTelegramId(telegram.user.id.toString());
      this.sendSuccess(res, missions);
    }, 'получения миссий пользователя');
    } catch (error) {
      next(error);
    }
  }

  async completeMissionById(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const user = await userRepository.getOrCreateUserFromTelegram({
          telegram_id: telegram.user.id,
          username: telegram.user.username,
          first_name: telegram.user.first_name,
          ref_by: req.query.start_param as string
        });

        const missionId = parseInt(req.params.missionId);
        if (isNaN(missionId)) {
          return this.sendError(res, 'Invalid mission ID', 400);
        }

        const result = await missionsService.completeMission(
          telegram.user.id.toString(),
          missionId
        );

        this.sendSuccess(res, result);
      }, 'выполнения миссии по ID');
    } catch (error) {
      next(error);
    }
  }

  async claimMissionReward(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
        const telegram = this.validateTelegramAuth(req, res);
        if (!telegram) return;

        const user = await userRepository.getOrCreateUserFromTelegram({
          telegram_id: telegram.user.id,
          username: telegram.user.username,
          first_name: telegram.user.first_name,
          ref_by: req.query.start_param as string
        });

        const missionId = parseInt(req.params.missionId);
        if (isNaN(missionId)) {
          return this.sendError(res, 'Invalid mission ID', 400);
        }

        const result = await missionsService.claimMissionReward(
          telegram.user.id.toString(),
          missionId
        );

        this.sendSuccess(res, result);
      }, 'получения награды за миссию');
    } catch (error) {
      next(error);
    }
  }
}