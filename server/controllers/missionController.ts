import { Request, Response, NextFunction } from 'express';
import { MissionService } from '../services/missionService';
import { sendSuccess, sendSuccessArray, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { completeMissionSchema, userMissionsQuerySchema, userMissionsWithCompletionSchema } from '../validators/schemas';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

/**
 * Контроллер для работы с миссиями
 * Отвечает за обработку HTTP-запросов связанных с миссиями
 */
export class MissionController {
  /**
   * Получает все активные миссии
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async getActiveMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeMissions = await MissionService.getActiveMissions();
      // Важно: Сохраняем текущий формат ответа для обратной совместимости с фронтендом
      sendSuccessArray(res, activeMissions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает выполненные миссии пользователя
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async getUserCompletedMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров
      const validationResult = userMissionsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        throw new ValidationError('Некорректные параметры запроса', validationResult.error.format());
      }

      const { user_id } = validationResult.data;
      
      // Получаем выполненные миссии
      const completedMissions = await MissionService.getUserCompletedMissions(user_id);
      
      // Отправляем ответ
      sendSuccessArray(res, completedMissions);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Получает все миссии с информацией о выполнении для пользователя
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async getMissionsWithCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров
      const validationResult = userMissionsWithCompletionSchema.safeParse(req.query);
      if (!validationResult.success) {
        throw new ValidationError('Некорректные параметры запроса', validationResult.error.format());
      }

      const { user_id } = validationResult.data;
      
      // Получаем миссии со статусом выполнения
      const missionsWithCompletion = await MissionService.getAllMissionsWithCompletion(user_id);
      
      // Отправляем ответ
      sendSuccessArray(res, missionsWithCompletion);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Проверяет выполнена ли миссия пользователем
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async checkMissionCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const missionId = parseInt(req.params.missionId);
      
      if (isNaN(userId) || isNaN(missionId) || userId <= 0 || missionId <= 0) {
        throw new ValidationError('Некорректные ID пользователя или миссии');
      }
      
      // Проверяем выполнение миссии
      const isCompleted = await MissionService.isUserMissionCompleted(userId, missionId);
      
      // Отправляем результат
      sendSuccess(res, { is_completed: isCompleted });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Завершает миссию для пользователя
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async completeMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация тела запроса
      const validationResult = completeMissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        throw new ValidationError('Некорректные данные запроса', validationResult.error.format());
      }

      const { user_id, mission_id } = validationResult.data;
      
      // Выполняем миссию через сервис
      const result = await MissionService.completeMission(user_id, mission_id);
      
      // Отправляем результат
      sendSuccess(res, result);
    } catch (error) {
      // Пропускаем ошибку в централизованный обработчик
      next(error);
    }
  }
}