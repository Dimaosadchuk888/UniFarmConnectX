import { Request, Response, NextFunction } from 'express';
import { DailyBonusService } from '../services/dailyBonusService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с ежедневными бонусами с поддержкой fallback режима
 */
export class DailyBonusControllerFallback {
  /**
   * Получает статус ежедневного бонуса пользователя
   * @route GET /api/daily-bonus/status
   */
  static async checkDailyBonusStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getDailyBonusStatusWithFallback = wrapServiceFunction(
        DailyBonusService.getDailyBonusStatus.bind(DailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusControllerFallback] Возвращаем заглушку для бонуса по ID: ${userId}`, error);
          
          // Возвращаем данные по умолчанию при отсутствии соединения с БД
          return {
            available: true,
            streak_days: 0,
            last_claim_date: null,
            next_claim_available_at: new Date().toISOString(),
            current_streak_bonus: 10, // Минимальный бонус
            next_streak_bonus: 15,
            claim_count: 0
          };
        }
      );
      
      const bonusStatus = await getDailyBonusStatusWithFallback(user_id);
      sendSuccess(res, bonusStatus);
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
      // Валидация входных данных
      const validationResult = userIdSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { user_id } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок
      const claimDailyBonusWithFallback = wrapServiceFunction(
        DailyBonusService.claimDailyBonus.bind(DailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusControllerFallback] Возвращаем заглушку для получения бонуса по ID: ${userId}`, error);
          
          // Возвращаем сообщение об ошибке при отсутствии соединения с БД
          return {
            success: false,
            message: "База данных недоступна, получение бонуса временно невозможно",
            amount: 0,
            streak_days: 0,
            next_bonus: 15
          };
        }
      );
      
      const claimResult = await claimDailyBonusWithFallback(user_id);
      sendSuccess(res, claimResult);
    } catch (error) {
      next(error);
    }
  }
}