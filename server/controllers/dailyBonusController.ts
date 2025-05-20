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
 * Контроллер для работы с ежедневными бонусами
 * Отвечает за обработку HTTP-запросов, валидацию входных данных,
 * вызов соответствующих методов сервиса и формирование ответов
 * Включает механизмы fallback для работы при отсутствии соединения с БД
 */
export class DailyBonusController {
  /**
   * Проверяет доступность бонуса для пользователя
   * с поддержкой работы при отсутствии соединения с БД
   * @route GET /api/daily-bonus/status
   */
  static async checkDailyBonusStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса с Zod-схемой
      const validationResult = dailyBonusQuerySchema.safeParse(req.query);
      
      // Если валидация не прошла, генерируем ошибку с форматированным сообщением
      if (!validationResult.success) {
        throw new ValidationError(
          'Ошибка валидации ID пользователя', 
          formatZodErrors(validationResult.error)
        );
      }
      
      // Получаем ID пользователя из валидированных данных
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getDailyBonusStatusWithFallback = wrapServiceFunction(
        dailyBonusService.getDailyBonusStatus.bind(dailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusController] Возвращаем заглушку для статуса бонуса по ID: ${userId}`);
          
          // Возвращаем данные-заглушки при отсутствии соединения с БД
          return {
            available: false,
            hours_until_next: 24,
            last_claimed_at: null,
            streak_days: 0,
            current_bonus_amount: "0",
            next_bonus_amount: "0",
            message: "Недоступно при отсутствии соединения"
          };
        }
      );
      
      // Вызываем сервис с обработкой ошибок
      const bonusStatus = await getDailyBonusStatusWithFallback(user_id);
      
      // Отправляем успешный ответ
      sendSuccess(res, bonusStatus);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
  
  /**
   * Выдает пользователю ежедневный бонус
   * с поддержкой работы при отсутствии соединения с БД
   * @route POST /api/daily-bonus/claim
   */
  static async claimDailyBonus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация тела запроса с Zod-схемой
      const validationResult = userIdSchema.safeParse(req.body);
      
      // Если валидация не прошла, генерируем ошибку с форматированным сообщением
      if (!validationResult.success) {
        throw new ValidationError(
          'Ошибка валидации ID пользователя', 
          formatZodErrors(validationResult.error)
        );
      }
      
      // Получаем ID пользователя из валидированных данных
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const claimDailyBonusWithFallback = wrapServiceFunction(
        dailyBonusService.claimDailyBonus.bind(dailyBonusService),
        async (error, userId) => {
          console.log(`[DailyBonusController] Возвращаем заглушку для получения бонуса по ID: ${userId}`);
          
          // Возвращаем данные-заглушки при отсутствии соединения с БД
          return {
            success: false,
            received_amount: "0",
            new_balance: "0",
            streak_days: 0,
            next_bonus_amount: "0",
            hours_until_next: 24,
            message: "Получение бонуса невозможно при отсутствии соединения с базой данных"
          };
        }
      );
      
      // Вызываем сервис с обработкой ошибок
      const result = await claimDailyBonusWithFallback(user_id);
      
      // Даже если бонус не получен (уже забран сегодня), 
      // используем стандартный формат ответа с полем success
      sendSuccess(res, result);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
}