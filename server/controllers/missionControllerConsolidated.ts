import { Request, Response, NextFunction } from 'express';
import { missionService } from '../services';
import { MissionStatus, MissionWithCompletion } from '../services/missionServiceInstance';
import { sendSuccess, sendSuccessArray } from '../utils/responseUtils';
import { 
  completeMissionSchema, 
  userMissionsQuerySchema, 
  userMissionsWithCompletionSchema,
  missionStatusSchema,
  submitMissionSchema,
  userIdSchema
} from '../validators/schemas';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validationUtils';
import { MissionService } from '../services/missionService';
import { DatabaseService } from "../db-service-wrapper";

/**
 * Консолидированный контроллер для работы с миссиями
 * с поддержкой работы в аварийном (fallback) режиме при проблемах с БД
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
      try {
        console.log('[MissionController] 🔍 Запрос активных миссий...');
        const activeMissions = await missionService.getActiveMissions();
        console.log('[MissionController] 📊 Получено миссий:', activeMissions.length);
        console.log('[MissionController] 📋 Список миссий:', activeMissions);
        // Важно: Сохраняем текущий формат ответа для обратной совместимости с фронтендом
        sendSuccessArray(res, activeMissions);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionController] Возвращаем резервные данные для активных заданий после ошибки БД`);
        
        // Возвращаем базовые задания при отсутствии соединения с БД
        const fallbackMissions = [
          {
            id: 1,
            type: 'daily',
            title: 'Ежедневный бонус',
            description: 'Получите ежедневный бонус',
            reward_uni: '5',
            is_active: true
          },
          {
            id: 2,
            type: 'social',
            title: 'Подписка на канал',
            description: 'Подпишитесь на наш Telegram канал',
            reward_uni: '10',
            is_active: true
          },
          {
            id: 3,
            type: 'referral',
            title: 'Пригласите друга',
            description: 'Пригласите друга и получите вознаграждение',
            reward_uni: '20',
            is_active: true
          }
        ];
        
        sendSuccessArray(res, fallbackMissions);
      }
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
      
      try {
        // Получаем выполненные миссии
        const completedMissions = await missionService.getUserCompletedMissions(user_id);
        
        // Отправляем ответ
        sendSuccessArray(res, completedMissions);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionController] Fallback: Возвращаем заглушку для выполненных заданий пользователя: ${user_id}`);
        
        // Возвращаем пустой список, если нет соединения с БД
        sendSuccessArray(res, []);
      }
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
      
      try {
        // Получаем миссии со статусом выполнения
        const missionsWithCompletion = await missionService.getAllMissionsWithCompletion(user_id);
        
        // Отправляем ответ
        sendSuccessArray(res, missionsWithCompletion);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionController] Fallback: Возвращаем заглушку для заданий со статусом выполнения для пользователя: ${user_id}`);
        
        // Возвращаем базовые демо-задания при отсутствии соединения с БД
        const fallbackMissions = [
          {
            id: 1,
            type: 'daily',
            title: 'Ежедневный бонус',
            description: 'Получите ежедневный бонус',
            reward_uni: '5',
            is_active: true,
            is_completed: false,
            completed_at: null,
            status: MissionStatus.AVAILABLE,
            progress: 0
          },
          {
            id: 2,
            type: 'social',
            title: 'Подписка на канал',
            description: 'Подпишитесь на наш Telegram канал',
            reward_uni: '10',
            is_active: true,
            is_completed: false,
            completed_at: null,
            status: MissionStatus.AVAILABLE,
            progress: 0
          },
          {
            id: 3,
            type: 'referral',
            title: 'Пригласите друга',
            description: 'Пригласите друга и получите бонус',
            reward_uni: '15',
            is_active: true,
            is_completed: false,
            completed_at: null,
            status: MissionStatus.AVAILABLE,
            progress: 0
          }
        ] as MissionWithCompletion[];
        
        sendSuccessArray(res, fallbackMissions);
      }
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
      
      try {
        // Проверяем выполнение миссии
        const isCompleted = await missionService.isUserMissionCompleted(userId, missionId);
        
        // Отправляем результат
        sendSuccess(res, { is_completed: isCompleted });
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionController] Fallback: Возвращаем заглушку для проверки выполнения задания ${missionId} пользователем: ${userId}`);
        
        // Возвращаем по умолчанию что задание не выполнено
        sendSuccess(res, { 
          is_completed: false,
          is_fallback: true,
          message: "База данных недоступна, информация о выполнении задания временно недоступна"
        });
      }
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
      
      try {
        // Сначала пробуем выполнить через БД
        const result = await missionService.completeMission(user_id, mission_id);
        
        // Отправляем ответ
        sendSuccess(res, result);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем информативное сообщение
        console.log(`[MissionController] Fallback: Ошибка БД при выполнении задания ${mission_id} пользователем: ${user_id}`);
        
        // Возвращаем сообщение об ошибке при проблемах с БД
        sendSuccess(res, {
          success: false,
          message: "База данных недоступна, выполнение задания временно невозможно",
          user_id: user_id,
          mission_id: mission_id,
          is_fallback: true
        });
      }
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
      
      try {
        // Получаем статус миссии через сервис
        const status = await missionService.getMissionStatus(
          parseInt(userId),
          parseInt(missionId)
        );
        
        // Отправляем результат
        sendSuccess(res, status);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем информативное сообщение
        console.log(`[MissionController] Fallback: Ошибка БД при получении статуса задания ${missionId} пользователя: ${userId}`);
        
        // Возвращаем базовый статус при проблемах с БД
        sendSuccess(res, {
          mission_id: parseInt(missionId),
          user_id: parseInt(userId),
          status: MissionStatus.AVAILABLE,
          progress: 0,
          is_completed: false,
          is_fallback: true,
          message: "База данных недоступна, статус задания временно недоступен"
        });
      }
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
      
      try {
        // Отправляем миссию на проверку через сервис
        const result = await missionService.submitMission(user_id, mission_id);
        
        // Отправляем результат
        sendSuccess(res, result);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем информативное сообщение
        console.log(`[MissionController] Fallback: Ошибка БД при отправке задания ${mission_id} на проверку пользователем: ${user_id}`);
        
        // Возвращаем сообщение об ошибке при проблемах с БД
        sendSuccess(res, {
          success: false,
          message: "База данных недоступна, отправка задания на проверку временно невозможна",
          user_id: user_id,
          mission_id: mission_id,
          is_fallback: true
        });
      }
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
      
      try {
        // Получаем награду через сервис
        const result = await missionService.claimMissionReward(user_id, mission_id);
        
        // Отправляем результат
        sendSuccess(res, result);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем информативное сообщение
        console.log(`[MissionController] Fallback: Ошибка БД при получении награды за задание ${mission_id} пользователем: ${user_id}`);
        
        // Возвращаем сообщение об ошибке при проблемах с БД
        sendSuccess(res, {
          success: false,
          message: "База данных недоступна, получение награды временно невозможно",
          user_id: user_id,
          mission_id: mission_id,
          is_fallback: true
        });
      }
    } catch (error) {
      next(error);
    }
  }
}