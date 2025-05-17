/**
 * Fallback контроллер для работы с заданиями (missions)
 * с поддержкой автоматического перехода в режим работы без БД
 */

import { Request, Response, NextFunction } from 'express';
import { MissionService, MissionWithCompletion, MissionStatus } from '../services/missionService';
import { wrapServiceFunction } from '../db-service-wrapper';
import { sendSuccess, sendSuccessArray } from '../utils/responseUtils';
import { userIdSchema } from '../validators/schemas';
import { ValidationError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validationUtils';

// Тип для совместимости с MissionWithCompletion в режиме fallback
interface MissionWithCompletionFallback {
  id: number;
  type: string;
  title: string;
  description: string;
  reward_uni: string;
  is_active: boolean;
  is_completed: boolean;
  completed_at: null;
  status: MissionStatus;
  progress: number;
}

export class MissionControllerFallback {
  /**
   * Получает список активных заданий
   * @route GET /api/missions/active
   */
  static async getActiveMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      try {
        // Сначала пробуем запросить из базы
        const activeMissions = await MissionService.getActiveMissions();
        sendSuccessArray(res, activeMissions);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionControllerFallback] Возвращаем заглушку для активных заданий`);
        
        // Возвращаем базовые демо-задания при отсутствии соединения с БД
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
            description: 'Пригласите друга и получите бонус',
            reward_uni: '15',
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
   * Получает список выполненных заданий пользователя
   * @route GET /api/user_missions
   */
  static async getUserCompletedMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      try {
        // Сначала пробуем получить данные из БД
        const completedMissions = await MissionService.getUserCompletedMissions(user_id);
        sendSuccessArray(res, completedMissions);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionControllerFallback] Возвращаем заглушку для выполненных заданий пользователя: ${user_id}`);
        
        // Возвращаем пустой список, если нет соединения с БД
        sendSuccessArray(res, []);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает список заданий со статусом выполнения для пользователя
   * @route GET /api/missions/with-completion
   */
  static async getMissionsWithCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      try {
        // Сначала пробуем получить данные из БД
        const missionsWithCompletion = await MissionService.getAllMissionsWithCompletion(user_id);
        sendSuccessArray(res, missionsWithCompletion);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionControllerFallback] Возвращаем заглушку для заданий со статусом выполнения для пользователя: ${user_id}`);
        
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
   * Проверяет выполнение задания пользователем
   * @route GET /api/missions/check/:userId/:missionId
   */
  static async checkMissionCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const missionId = parseInt(req.params.missionId);
      
      if (isNaN(userId) || isNaN(missionId)) {
        throw new ValidationError('Некорректные параметры запроса', {
          userId: isNaN(userId) ? 'Должен быть числом' : '',
          missionId: isNaN(missionId) ? 'Должен быть числом' : ''
        });
      }
      
      try {
        // Сначала пробуем получить данные из БД
        const isCompleted = await MissionService.isUserMissionCompleted(userId, missionId);
        sendSuccess(res, { is_completed: isCompleted });
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionControllerFallback] Возвращаем заглушку для проверки выполнения задания ${missionId} пользователем: ${userId}`);
        
        // Возвращаем по умолчанию что задание не выполнено
        sendSuccess(res, { is_completed: false });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Отмечает задание как выполненное и начисляет награду
   * @route POST /api/missions/complete
   */
  static async completeMission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user_id, mission_id } = req.body;
      
      if (!user_id || !mission_id) {
        throw new ValidationError('Некорректные параметры запроса', {
          user_id: !user_id ? 'Обязательное поле' : '',
          mission_id: !mission_id ? 'Обязательное поле' : ''
        });
      }
      
      try {
        // Сначала пробуем выполнить через БД
        const completionResult = await MissionService.completeMission(user_id, mission_id);
        sendSuccess(res, completionResult);
      } catch (dbError) {
        // В случае ошибки БД, возвращаем заглушку
        console.log(`[MissionControllerFallback] Возвращаем заглушку для выполнения задания ${mission_id} пользователем: ${user_id}`);
        
        // Возвращаем сообщение об ошибке при отсутствии соединения с БД
        sendSuccess(res, {
          success: false,
          message: "База данных недоступна, выполнение задания временно невозможно",
          user_id: user_id,
          mission_id: mission_id
        });
      }
    } catch (error) {
      next(error);
    }
  }
}