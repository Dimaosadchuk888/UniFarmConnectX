import { Request, Response } from 'express';
import { MissionService } from '../services/missionService';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { completeMissionSchema } from '../validators/schemas';
import { ZodError } from 'zod';

/**
 * Контроллер для работы с миссиями
 */
export class MissionController {
  /**
   * Получает все активные миссии
   */
  static async getActiveMissions(req: Request, res: Response): Promise<void> {
    try {
      const activeMissions = await MissionService.getActiveMissions();
      // Важно: Сохраняем текущий формат ответа для обратной совместимости с фронтендом
      sendSuccessArray(res, activeMissions);
    } catch (error) {
      console.error('Error fetching active missions:', error);
      sendServerError(res, 'Failed to fetch active missions');
    }
  }

  /**
   * Получает выполненные миссии пользователя
   */
  static async getUserCompletedMissions(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'query');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const completedMissions = await MissionService.getUserCompletedMissions(userId);
      // Важно: Сохраняем текущий формат ответа для обратной совместимости с фронтендом
      sendSuccessArray(res, completedMissions);
    } catch (error) {
      console.error('Error fetching user completed missions:', error);
      sendServerError(res, 'Failed to fetch user completed missions');
    }
  }

  /**
   * Завершает миссию для пользователя
   */
  static async completeMission(req: Request, res: Response): Promise<void> {
    try {
      // Валидация тела запроса
      const validationResult = completeMissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return sendError(res, 'Invalid request data', 400, validationResult.error.format());
      }

      const { user_id, mission_id } = validationResult.data;
      
      // Выполняем миссию
      const result = await MissionService.completeMission(user_id, mission_id);
      
      if (!result.success) {
        return res.status(result.message.includes('not found') ? 404 : 400).json(result);
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Error completing mission:', error);
      sendServerError(res, 'Failed to complete mission');
    }
  }
}