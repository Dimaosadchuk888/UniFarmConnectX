import { Request, Response, NextFunction } from 'express';
import { BoostService } from '../services/boostService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { boostUserQuerySchema, boostRequestSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';

/**
 * Контроллер для работы с буст-пакетами с поддержкой fallback режима
 */
export class BoostControllerFallback {
  /**
   * Получает список всех доступных буст-пакетов
   * @route GET /api/boosts
   */
  static async getBoostPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Этот метод не требует доступа к БД, поэтому просто вызываем оригинальный метод
      const boostPackages = BoostService.getBoostPackages();
      sendSuccess(res, boostPackages);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Получает список активных буст-пакетов пользователя с поддержкой fallback
   * @route GET /api/boosts/active?user_id=123
   */
  static async getUserActiveBoosts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = boostUserQuerySchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getActiveBoostsWithFallback = wrapServiceFunction(
        BoostService.getUserActiveBoosts.bind(BoostService),
        async (error, userId) => {
          console.log(`[BoostControllerFallback] Возвращаем заглушку для активных бустов по ID: ${userId}`);
          
          // Возвращаем пустой массив при отсутствии соединения с БД
          return { 
            boosts: [], 
            has_active_boosts: false 
          };
        }
      );
      
      try {
        const activeBoosts = await getActiveBoostsWithFallback(user_id);
        sendSuccess(res, activeBoosts);
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[BoostControllerFallback] Ошибка БД, возвращаем пустые буст-депозиты для ID: ${user_id}`);
        sendSuccess(res, { 
          boosts: [], 
          has_active_boosts: false 
        });
      }
    } catch (error) {
      // Обработка всех остальных ошибок (включая валидацию)
      console.error('[BoostControllerFallback] Ошибка:', error);
      sendSuccess(res, { 
        boosts: [], 
        has_active_boosts: false 
      });
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
        BoostService.getUserFarmingBoosts.bind(BoostService),
        async (error, userId) => {
          console.log(`[BoostControllerFallback] Возвращаем заглушку для активных бустов фарминга по ID: ${userId}`);
          // Возвращаем пустой массив при отсутствии соединения с БД
          return [];
        }
      );
      
      try {
        const farmingBoosts = await getActiveBoostsWithFallback(userId);
        res.json({ success: true, data: farmingBoosts });
      } catch (dbError) {
        console.error("[BoostControllerFallback] Ошибка БД при получении бустов фарминга:", dbError);
        res.json({ success: true, data: [] });
      }
    } catch (error) {
      console.error('[BoostControllerFallback] Ошибка в getUserFarmingBoosts:', error);
      res.json({ success: true, data: [] });
    }
  }

  /**
   * Покупает буст-пакет для пользователя с поддержкой fallback
   * @route POST /api/boosts/purchase
   */
  static async purchaseBoost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = boostRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { user_id, boost_id } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок
      const purchaseBoostWithFallback = wrapServiceFunction(
        BoostService.purchaseBoost.bind(BoostService),
        async (error, userId, boostId) => {
          console.log(`[BoostControllerFallback] Возвращаем заглушку для покупки буста ID: ${boostId} для пользователя: ${userId}`);
          
          // Возвращаем сообщение об ошибке при отсутствии соединения с БД
          return {
            success: false,
            message: "База данных недоступна, покупка буста временно невозможна",
            boost_id: boostId
          };
        }
      );
      
      try {
        const purchaseResult = await purchaseBoostWithFallback(user_id, boost_id);
        sendSuccess(res, purchaseResult);
      } catch (dbError) {
        // Обработка ошибок подключения к БД
        console.log(`[BoostControllerFallback] Ошибка БД при покупке буста ID: ${boost_id} для пользователя: ${user_id}`);
        sendSuccess(res, {
          success: false,
          message: "База данных недоступна, покупка буста временно невозможна",
          boost_id: boost_id
        });
      }
    } catch (error) {
      // Обработка всех остальных ошибок (включая валидацию)
      console.error('[BoostControllerFallback] Критическая ошибка:', error);
      sendSuccess(res, {
        success: false,
        message: "Произошла ошибка при обработке запроса",
        boost_id: req.body?.boost_id || 0
      });
    }
  }
}