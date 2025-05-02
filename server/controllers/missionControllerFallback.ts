/**
 * Fallback контроллер для работы с заданиями (missions)
 * с поддержкой автоматического перехода в режим работы без БД
 */

import { Request, Response, NextFunction } from 'express';
import { MissionService } from '../services/missionService';
import { wrapServiceFunction } from '../db-service-wrapper';
import { sendSuccess, sendSuccessArray } from '../utils/responseUtils';
import { userIdSchema } from '../validators/schemas';
import { ValidationError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validationUtils';

export class MissionControllerFallback {
  /**
   * Получает список активных заданий
   * @route GET /api/missions/active
   */
  static async getActiveMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getActiveMissionsWithFallback = wrapServiceFunction(
        MissionService.getActiveMissions.bind(MissionService),
        async (error) => {
          console.log(`[MissionControllerFallback] Возвращаем заглушку для активных заданий`);
          
          // Возвращаем базовые демо-задания при отсутствии соединения с БД
          return [
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
        }
      );
      
      const activeMissions = await getActiveMissionsWithFallback();
      sendSuccessArray(res, activeMissions);
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
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getUserCompletedMissionsWithFallback = wrapServiceFunction(
        MissionService.getUserCompletedMissions.bind(MissionService),
        async (error, userId) => {
          console.log(`[MissionControllerFallback] Возвращаем заглушку для выполненных заданий пользователя: ${userId}`);
          
          // Возвращаем пустой список, если нет соединения с БД
          return [];
        }
      );
      
      const completedMissions = await getUserCompletedMissionsWithFallback(user_id);
      sendSuccessArray(res, completedMissions);
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
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getMissionsWithCompletionWithFallback = wrapServiceFunction(
        MissionService.getAllMissionsWithCompletion.bind(MissionService),
        async (error, userId) => {
          console.log(`[MissionControllerFallback] Возвращаем заглушку для заданий со статусом выполнения для пользователя: ${userId}`);
          
          // Возвращаем базовые демо-задания при отсутствии соединения с БД
          return [
            {
              id: 1,
              type: 'daily',
              title: 'Ежедневный бонус',
              description: 'Получите ежедневный бонус',
              reward_uni: '5',
              is_active: true,
              completed: false
            },
            {
              id: 2,
              type: 'social',
              title: 'Подписка на канал',
              description: 'Подпишитесь на наш Telegram канал',
              reward_uni: '10',
              is_active: true,
              completed: false
            },
            {
              id: 3,
              type: 'referral',
              title: 'Пригласите друга',
              description: 'Пригласите друга и получите бонус',
              reward_uni: '15',
              is_active: true,
              completed: false
            }
          ];
        }
      );
      
      const missionsWithCompletion = await getMissionsWithCompletionWithFallback(user_id);
      sendSuccessArray(res, missionsWithCompletion);
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
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const isUserMissionCompletedWithFallback = wrapServiceFunction(
        MissionService.isUserMissionCompleted.bind(MissionService),
        async (error, userId, missionId) => {
          console.log(`[MissionControllerFallback] Возвращаем заглушку для проверки выполнения задания ${missionId} пользователем: ${userId}`);
          
          // Возвращаем по умолчанию что задание не выполнено
          return false;
        }
      );
      
      const isCompleted = await isUserMissionCompletedWithFallback(userId, missionId);
      sendSuccess(res, { is_completed: isCompleted });
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
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const completeMissionWithFallback = wrapServiceFunction(
        MissionService.completeMission.bind(MissionService),
        async (error, userId, missionId) => {
          console.log(`[MissionControllerFallback] Возвращаем заглушку для выполнения задания ${missionId} пользователем: ${userId}`);
          
          // Возвращаем сообщение об ошибке при отсутствии соединения с БД
          return {
            success: false,
            message: "База данных недоступна, выполнение задания временно невозможно",
            user_id: userId,
            mission_id: missionId
          };
        }
      );
      
      const completionResult = await completeMissionWithFallback(user_id, mission_id);
      sendSuccess(res, completionResult);
    } catch (error) {
      next(error);
    }
  }
}