import { Request, Response, NextFunction } from 'express';
import { boostService } from '../services/index.js';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { boostUserQuerySchema, boostRequestSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с буст-пакетами
 * Отвечает за обработку HTTP-запросов, валидацию входных данных,
 * вызов соответствующих методов сервиса и формирование ответов.
 * Включает механизмы fallback для работы при отсутствии соединения с БД.
 */
export class BoostController {
  /**
   * Получает список всех доступных буст-пакетов
   * @route GET /api/boosts
   */
  static async getBoostPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Вызов метода сервиса через экземпляр
      const boostPackages = boostService.getBoostPackages();
      
      // Отправка успешного ответа с данными
      sendSuccess(res, boostPackages);
    } catch (error) {
      // Передача ошибки централизованному обработчику
      next(error);
    }
  }
  
  /**
   * Получает активные буст-пакеты фарминга для пользователя
   * @route GET /api/farming/boosts/active?user_id=123
   */
  static async getUserFarmingBoosts(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.query.user_id);
      
      if (isNaN(userId)) {
        return res.json({ 
          success: false, 
          message: "Не указан или некорректный ID пользователя"
        });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getActiveBoostsWithFallback = wrapServiceFunction(
        boostService.getUserFarmingBoosts.bind(boostService),
        async (error, userId) => {
          console.log(`[BoostController] Возвращаем заглушку для активных бустов фарминга по ID: ${userId}`);
          // Возвращаем пустой массив при отсутствии соединения с БД
          return [];
        }
      );
      
      try {
        const farmingBoosts = await getActiveBoostsWithFallback(userId);
        res.json({ success: true, data: farmingBoosts });
      } catch (dbError) {
        console.error("[BoostController] Ошибка БД при получении бустов фарминга:", dbError);
        res.json({ 
          success: true, 
          data: [],
          is_fallback: true,
          message: "База данных недоступна, информация о бустах фарминга временно недоступна"
        });
      }
    } catch (error) {
      console.error('[BoostController] Ошибка в getUserFarmingBoosts:', error);
      res.json({ 
        success: true, 
        data: [],
        is_fallback: true,
        message: "Произошла ошибка при обработке запроса бустов фарминга"
      });
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
      
      try {
        // Стандартный путь - вызов сервиса для получения активных бустов пользователя
        const activeBoosts = await boostService.getUserActiveBoosts(user_id);
        sendSuccess(res, activeBoosts);
      } catch (dbError) {
        // Обработка ошибок при обращении к базе данных
        console.log(`[BoostController] Fallback: Ошибка БД, возвращаем пустые буст-депозиты для ID: ${user_id}`);
        sendSuccess(res, { 
          boosts: [], 
          has_active_boosts: false,
          is_fallback: true,
          message: "База данных недоступна, информация о бустах временно недоступна"
        });
      }
    } catch (error) {
      // Обработка всех остальных ошибок (включая валидацию)
      console.error('[BoostController] Ошибка:', error);
      sendSuccess(res, { 
        boosts: [], 
        has_active_boosts: false,
        is_fallback: true,
        message: "Произошла ошибка при запросе бустов"
      });
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

      try {
        // Вызов метода сервиса для покупки буста
        const purchaseResult = await boostService.purchaseBoost(user_id, boost_id);
        sendSuccess(res, purchaseResult);
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[BoostController] Fallback: Ошибка БД при покупке буста ${boost_id} для пользователя: ${user_id}`);
        sendSuccess(res, { 
          success: false, 
          message: 'База данных недоступна, покупка буста временно невозможна',
          error: 'database_unavailable',
          is_fallback: true,
          user_id,
          boost_id
        });
      }
    } catch (error) {
      // Обработка всех остальных ошибок (включая валидацию)
      console.error('[BoostController] Ошибка покупки буста:', error);
      sendSuccess(res, { 
        success: false, 
        message: 'Не удалось выполнить покупку буста из-за ошибки в запросе',
        error: 'request_error',
        is_fallback: true
      });
    }
  }

  /**
   * Получает историю покупок бустов для пользователя
   * @route GET /api/boosts/history?user_id=123
   */
  static async getBoostHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = boostUserQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      try {
        // Вызов сервиса для получения истории бустов, если такой метод существует
        if (typeof boostService.getUserBoostHistory === 'function') {
          const history = await boostService.getUserBoostHistory(user_id);
          sendSuccess(res, { history, success: true });
        } else {
          // Если метод не реализован, возвращаем пустую историю
          console.log(`[BoostController] Метод getUserBoostHistory не реализован`);
          sendSuccess(res, { 
            history: [], 
            success: true,
            is_fallback: true,
            message: "Функция получения истории бустов в разработке"
          });
        }
      } catch (dbError) {
        // Обработка ошибок при обращении к базе данных
        console.log(`[BoostController] Fallback: Ошибка БД, возвращаем пустую историю бустов для ID: ${user_id}`);
        sendSuccess(res, { 
          history: [], 
          success: true,
          is_fallback: true,
          message: "База данных недоступна, история бустов временно недоступна"
        });
      }
    } catch (error) {
      // Обработка всех остальных ошибок
      console.error('[BoostController] Ошибка получения истории бустов:', error);
      next(error);
    }
  }
}