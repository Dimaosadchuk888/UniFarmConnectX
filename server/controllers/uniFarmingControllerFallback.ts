import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema, depositFarmingRequestSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';
import { UniFarmingService } from '../services/uniFarmingService';

/**
 * Fallback контроллер для работы с UNI фармингом
 * с поддержкой автоматического перехода в режим работы без БД
 */
export class UniFarmingControllerFallback {
  /**
   * Получает информацию о UNI фарминге пользователя
   * @route GET /api/uni-farming/info
   */
  static async getUserFarmingInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getFarmingInfoWithFallback = wrapServiceFunction(
        UniFarmingService.getUserFarmingInfo.bind(UniFarmingService),
        async (error, userId) => {
          console.log(`[UniFarmingControllerFallback] Возвращаем заглушку для фарминга по ID: ${userId}`);
          
          // Возвращаем базовую информацию при отсутствии соединения с БД
          return {
            is_farming_active: false,
            uni_deposit_amount: "0",
            uni_farming_balance: "0",
            uni_farming_rate: "0",
            uni_farming_start_timestamp: null,
            uni_farming_last_update: null,
            details: {
              rate_per_second: "0.000000289351851800",
              rate_per_day: "0.025",
              total_earned: "0",
              time_since_start: 0,
              time_since_last_update: 0
            }
          };
        }
      );
      
      const farmingInfo = await getFarmingInfoWithFallback(user_id);
      sendSuccess(res, farmingInfo);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Активирует UNI фарминг для пользователя (депозит UNI)
   * @route POST /api/uni-farming/deposit
   */
  static async depositFarming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = depositFarmingRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      const { user_id, amount } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const depositFarmingWithFallback = wrapServiceFunction(
        UniFarmingService.depositFarming.bind(UniFarmingService),
        async (error, userId, depositAmount) => {
          console.log(`[UniFarmingControllerFallback] Возвращаем заглушку для депозита ${depositAmount} UNI для пользователя: ${userId}`);
          
          // Возвращаем сообщение об ошибке при отсутствии соединения с БД
          return {
            success: false,
            message: "База данных недоступна, операция временно невозможна",
            user_id: userId,
            amount: depositAmount
          };
        }
      );
      
      const depositResult = await depositFarmingWithFallback(user_id, amount);
      sendSuccess(res, depositResult);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Собирает накопленные UNI средства с фарминга
   * @route POST /api/uni-farming/harvest
   */
  static async harvestFarmingInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = userIdSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const harvestFarmingWithFallback = wrapServiceFunction(
        UniFarmingService.harvestFarming.bind(UniFarmingService),
        async (error, userId) => {
          console.log(`[UniFarmingControllerFallback] Возвращаем заглушку для харвеста фарминга для пользователя: ${userId}`);
          
          // Возвращаем сообщение об ошибке при отсутствии соединения с БД
          return {
            success: false,
            message: "База данных недоступна, сбор средств временно невозможен",
            harvested_amount: "0",
            new_balance: "0"
          };
        }
      );
      
      const harvestResult = await harvestFarmingWithFallback(user_id);
      sendSuccess(res, harvestResult);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получает список депозитов пользователя в UNI фарминге
   * @route GET /api/uni-farming/deposits
   */
  static async getUserFarmingDeposits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getDepositsWithFallback = wrapServiceFunction(
        UniFarmingService.getUserFarmingDeposits.bind(UniFarmingService),
        async (error, userId) => {
          console.log(`[UniFarmingControllerFallback] Возвращаем заглушку для депозитов фарминга по ID: ${userId}`);
          
          // Возвращаем пустой массив при отсутствии соединения с БД
          return [];
        }
      );
      
      const deposits = await getDepositsWithFallback(user_id);
      sendSuccess(res, deposits);
    } catch (error) {
      next(error);
    }
  }
}