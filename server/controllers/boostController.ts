import { Request, Response, NextFunction } from 'express';
import { BoostService } from '../services/boostService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError, NotFoundError, DatabaseError } from '../middleware/errorHandler';
import { boostUserQuerySchema, boostRequestSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';

/**
 * Контроллер для работы с буст-пакетами
 */
export class BoostController {
  /**
   * Получает список всех доступных буст-пакетов
   * @route GET /api/boosts
   */
  static async getBoostPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const boostPackages = BoostService.getBoostPackages();
      sendSuccess(res, boostPackages);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Получает список активных буст-пакетов пользователя
   * @route GET /api/boosts/active?user_id=123
   */
  static async getUserActiveBoosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация user_id с помощью созданной схемы
      const validationResult = boostUserQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      const activeBoosts = await BoostService.getUserActiveBoosts(user_id);
      sendSuccess(res, activeBoosts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Покупает буст-пакет для пользователя
   * @route POST /api/boosts/purchase
   */
  static async purchaseBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью созданной схемы
      const validationResult = boostRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { user_id, boost_id } = validationResult.data;

      const purchaseResult = await BoostService.purchaseBoost(user_id, boost_id);
      
      if (purchaseResult.success) {
        sendSuccess(res, purchaseResult);
      } else {
        // Если сервис вернул ошибку в формате объекта с success: false,
        // преобразуем её в исключение ValidationError
        throw new ValidationError(purchaseResult.message);
      }
    } catch (error) {
      // Передаем ошибку централизованному обработчику
      next(error);
    }
  }
}