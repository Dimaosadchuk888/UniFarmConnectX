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
 */
export class DailyBonusController {
  /**
   * Проверяет доступность бонуса для пользователя
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
      
      // Вызываем метод сервиса для получения статуса бонуса
      const bonusStatus: DailyBonusStatusResponse = 
        await dailyBonusService.getDailyBonusStatus(user_id);
      
      // Отправляем успешный ответ
      sendSuccess(res, bonusStatus);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
  
  /**
   * Выдает пользователю ежедневный бонус
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
      
      // Вызываем метод сервиса для получения бонуса
      const result: DailyBonusClaimResponse = 
        await dailyBonusService.claimDailyBonus(user_id);
      
      // Даже если бонус не получен (уже забран сегодня), 
      // используем стандартный формат ответа с полем success
      sendSuccess(res, result);
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
}