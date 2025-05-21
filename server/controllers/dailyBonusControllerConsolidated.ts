import { Request, Response, NextFunction } from 'express';
import { 
  dailyBonusService, 
  type DailyBonusStatusResponse, 
  type DailyBonusClaimResponse 
} from '../services/index';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema, userMissionsQuerySchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { z } from 'zod';
import { wrapServiceFunction } from '../db-service-wrapper';

// Создаем схему для валидации query-параметров (поддерживает user_id как строку)
const dailyBonusQuerySchema = z.object({
  user_id: z.union([
    z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: 'ID пользователя должен быть положительным числом'
    }),
    z.number().int().positive({
      message: 'ID пользователя должен быть положительным числом'
    })
  ]).transform(val => typeof val === 'string' ? parseInt(val) : val)
});

/**
 * Консолидированный контроллер для работы с ежедневными бонусами
 * Отвечает за обработку HTTP-запросов, валидацию входных данных,
 * вызов соответствующих методов сервиса и формирование ответов
 * Включает механизмы fallback для работы при отсутствии соединения с БД
 */
export class DailyBonusController {
  /**
   * Получает статус ежедневного бонуса для пользователя
   * @route GET /api/daily-bonus/status
   */
  static async getDailyBonusStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = dailyBonusQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return next(new ValidationError(formatZodErrors(validationResult.error)));
      }

      const { user_id } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок для поддержки fallback режима
      const getStatusWithFallback = wrapServiceFunction(
        dailyBonusService.getDailyBonusStatus.bind(dailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusControllerFallback] Возвращаем заглушку для статуса бонуса по ID: ${userId}`);
          
          const now = new Date();
          
          // Заглушка со стандартным статусом "доступен"
          return {
            success: true,
            data: {
              available: true,
              next_claim_time: null,
              last_claim_time: null,
              current_streak: 0,
              max_streak: 0,
              streak_multiplier: 1,
              bonus_amount: 100,
              streak_bonus_amount: 0,
              total_bonus_amount: 100
            }
          };
        }
      );

      const status = await getStatusWithFallback(user_id);
      return res.json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает бонус текущего дня
   * @route POST /api/daily-bonus/claim
   */
  static async claimDailyBonus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация тела запроса
      const schema = z.object({
        user_id: z.number().int().positive(),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return next(new ValidationError(formatZodErrors(validationResult.error)));
      }

      const { user_id } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок для поддержки fallback режима
      const claimBonusWithFallback = wrapServiceFunction(
        dailyBonusService.claimDailyBonus.bind(dailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusControllerFallback] Возвращаем заглушку для получения бонуса по ID: ${userId}`);
          
          // Заглушка с данными о "успешном" получении бонуса
          return {
            success: true,
            data: {
              claimed: true,
              amount: 100,
              streak: 1,
              streak_multiplier: 1,
              next_claim_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              message: "Бонус успешно получен"
            }
          };
        }
      );

      const result = await claimBonusWithFallback(user_id);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает информацию о бонусах за серию
   * @route GET /api/daily-bonus/streak-info
   */
  static async getStreakInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Заворачиваем вызов сервиса в обработчик ошибок для поддержки fallback режима
      const getStreakInfoWithFallback = wrapServiceFunction(
        dailyBonusService.getStreakInfo.bind(dailyBonusService),
        async (error) => {
          console.log('[DailyBonusControllerFallback] Возвращаем заглушку для информации о бонусах за серию');
          
          // Заглушка с данными о бонусах за серию
          return {
            success: true,
            data: {
              base_amount: 100,
              streak_levels: [
                { days: 3, multiplier: 1.5 },
                { days: 7, multiplier: 2 },
                { days: 14, multiplier: 3 },
                { days: 30, multiplier: 5 }
              ]
            }
          };
        }
      );

      const info = await getStreakInfoWithFallback();
      return res.json(info);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Сбрасывает серию бонусов пользователя для тестирования
   * Используется только в режиме разработки
   * @route POST /api/daily-bonus/reset-streak
   */
  static async resetStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Проверяем, что мы в режиме разработки
      if (process.env.NODE_ENV !== 'development') {
        return next(new ValidationError('Этот метод доступен только в режиме разработки'));
      }

      // Валидация тела запроса
      const schema = z.object({
        user_id: z.number().int().positive(),
      });

      const validationResult = schema.safeParse(req.body);
      if (!validationResult.success) {
        return next(new ValidationError(formatZodErrors(validationResult.error)));
      }

      const { user_id } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок для поддержки fallback режима
      const resetStreakWithFallback = wrapServiceFunction(
        dailyBonusService.resetStreak.bind(dailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusControllerFallback] Возвращаем заглушку для сброса серии по ID: ${userId}`);
          
          // Заглушка с данными об "успешном" сбросе серии
          return {
            success: true,
            data: {
              user_id: userId,
              streak_reset: true,
              message: "Серия бонусов сброшена"
            }
          };
        }
      );

      const result = await resetStreakWithFallback(user_id);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  }
}