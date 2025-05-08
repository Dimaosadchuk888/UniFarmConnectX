import { Request, Response, NextFunction } from 'express';
import { missionService } from '../services';
import { MissionStatus } from '../services/missionServiceInstance'; // Импортируем только константу из файла с интерфейсом
import { sendSuccess, sendSuccessArray } from '../utils/responseUtils';
import { 
  completeMissionSchema, 
  userMissionsQuerySchema, 
  userMissionsWithCompletionSchema,
  missionStatusSchema,
  submitMissionSchema
} from '../validators/schemas';
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
      const activeMissions = await missionService.getActiveMissions();
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
        // Преобразуем ошибки Zod в формат, понятный для ValidationError
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        // Извлекаем сообщения ошибок и преобразуем их в строки
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные параметры запроса', errorDetails);
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
        // Преобразуем ошибки Zod в формат, понятный для ValidationError
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        // Извлекаем сообщения ошибок и преобразуем их в строки
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные параметры запроса', errorDetails);
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
        // Преобразуем ошибки Zod в формат, понятный для ValidationError
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        // Извлекаем сообщения ошибок и преобразуем их в строки
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные данные запроса', errorDetails);
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

  /**
   * Получает статус выполнения миссии
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async getMissionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров
      const validationResult = missionStatusSchema.safeParse(req.params);
      if (!validationResult.success) {
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные параметры запроса', errorDetails);
      }

      const { userId, missionId } = validationResult.data;
      
      // Получаем статус миссии через сервис
      const status = await MissionService.getMissionStatus(
        parseInt(userId),
        parseInt(missionId)
      );
      
      // Отправляем результат
      sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Отправляет миссию на проверку/выполнение
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async submitMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация тела запроса
      const validationResult = submitMissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные данные запроса', errorDetails);
      }

      const { user_id, mission_id } = validationResult.data;
      
      // Отправляем миссию на проверку через сервис
      const result = await MissionService.submitMission(user_id, mission_id);
      
      // Отправляем результат
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает награду за выполненную миссию
   * @param req Express Request
   * @param res Express Response
   * @param next Express NextFunction
   */
  static async claimMissionReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация тела запроса
      const validationResult = submitMissionSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorDetails: Record<string, string> = {};
        const formattedErrors = validationResult.error.format();
        
        Object.entries(formattedErrors).forEach(([key, value]) => {
          if (key !== '_errors' && typeof value === 'object' && '_errors' in value) {
            errorDetails[key] = value._errors.join(', ');
          }
        });
        
        throw new ValidationError('Некорректные данные запроса', errorDetails);
      }

      const { user_id, mission_id } = validationResult.data;
      
      // Получаем награду через сервис
      const result = await MissionService.claimMissionReward(user_id, mission_id);
      
      // Отправляем результат
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}