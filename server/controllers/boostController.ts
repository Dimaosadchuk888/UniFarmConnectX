import { Request, Response, NextFunction } from 'express';
import { BoostService } from '../services/boostService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { boostUserQuerySchema, boostRequestSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';

/**
 * Контроллер для работы с буст-пакетами
 * Отвечает за обработку HTTP-запросов, валидацию входных данных,
 * вызов соответствующих методов сервиса и формирование ответов.
 */
export class BoostController {
  /**
   * Получает список всех доступных буст-пакетов
   * @route GET /api/boosts
   */
  static async getBoostPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Вызов метода сервиса
      const boostPackages = BoostService.getBoostPackages();
      
      // Отправка успешного ответа с данными
      sendSuccess(res, boostPackages);
    } catch (error) {
      // Передача ошибки централизованному обработчику
      next(error);
    }
  }
  
  /**
   * Получает список активных буст-пакетов пользователя
   * @route GET /api/boosts/active?user_id=123
   */
  static async getUserActiveBoosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса с помощью Zod схемы
      const validationResult = boostUserQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Вызов метода сервиса для получения активных бустов пользователя
      const activeBoosts = await BoostService.getUserActiveBoosts(user_id);
      
      // Отправка успешного ответа с данными
      sendSuccess(res, activeBoosts);
    } catch (error) {
      // Передача ошибки централизованному обработчику
      next(error);
    }
  }

  /**
   * Покупает буст-пакет для пользователя
   * @route POST /api/boosts/purchase
   */
  static async purchaseBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod схемы
      const validationResult = boostRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { user_id, boost_id } = validationResult.data;

      // Вызов метода сервиса для покупки буста
      // Если в сервисе возникнет ошибка (InsufficientFundsError, NotFoundError и пр.), 
      // она будет обработана централизованным обработчиком через next(error)
      const purchaseResult = await BoostService.purchaseBoost(user_id, boost_id);
      
      // Отправка успешного ответа с результатом покупки
      sendSuccess(res, purchaseResult);
    } catch (error) {
      // Передача ошибки централизованному обработчику
      next(error);
    }
  }
}