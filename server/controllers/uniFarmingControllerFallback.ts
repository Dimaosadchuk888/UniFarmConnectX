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
   * Симулирует начисление вознаграждения в фарминге для тестирования
   * Этот метод используется только для тестовых целей и не должен быть доступен в production
   * @route POST /api/uni-farming/simulate-reward
   */
  static async simulateReward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('Получен запрос POST /api/uni-farming/simulate-reward');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Тело запроса:', JSON.stringify(req.body));
      
      // Проверка содержимого запроса
      if (!req.body) {
        throw new ValidationError('Тело запроса пустое');
      }
      
      // Получение user_id и amount из тела запроса
      const { user_id, amount } = req.body;
      
      if (amount === undefined || amount === null || amount === '') {
        throw new ValidationError('Отсутствует обязательное поле amount');
      }
      
      // Валидация amount (поддержка как строкового, так и числового формата)
      let numericAmount: number;
      
      if (typeof amount === 'number') {
        console.log('Получен amount как число:', amount);
        numericAmount = amount;
      } else if (typeof amount === 'string') {
        console.log('Получен amount как строка:', amount);
        numericAmount = parseFloat(amount);
        if (isNaN(numericAmount)) {
          throw new ValidationError('Amount должен быть корректным числом');
        }
      } else {
        console.log('Ошибка: amount имеет неподдерживаемый тип:', typeof amount);
        throw new ValidationError('Amount должно быть числом или строкой');
      }
      
      // Проверяем, что amount положительное число
      if (numericAmount <= 0) {
        throw new ValidationError('Amount должен быть положительным числом');
      }
      
      // Обработка user_id (включая случай с null и undefined)
      let userId = 1; // значение по умолчанию
      
      if (user_id !== undefined && user_id !== null) {
        const userIdValue = parseInt(String(user_id));
        if (isNaN(userIdValue) || userIdValue <= 0 || userIdValue !== Number(user_id)) {
          throw new ValidationError('user_id должен быть положительным целым числом');
        }
        userId = userIdValue;
      }
      
      console.log(`Симуляция вознаграждения для user_id=${userId}, amount=${numericAmount}`);
      
      // Возвращаем успешный результат
      sendSuccess(res, {
        success: true,
        message: 'Вознаграждение успешно симулировано',
        user_id: userId,
        amount: numericAmount
      });
    } catch (error) {
      console.error('Ошибка в simulateReward:', error);
      next(error);
    }
  }
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
   * Получает текущий статус UNI фарминга пользователя в формате, совместимом с клиентом
   * @route GET /api/uni-farming/status
   */
  static async getUserFarmingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Заворачиваем вызов сервиса в обработчик ошибок с поддержкой fallback
      const getFarmingStatusWithFallback = wrapServiceFunction(
        UniFarmingService.getUserFarmingInfo.bind(UniFarmingService),
        async (error, userId) => {
          console.log(`[UniFarmingControllerFallback] Возвращаем заглушку для статуса фарминга по ID: ${userId}`);
          
          // Возвращаем формат совместимый с клиентом для статуса
          return {
            isActive: false,
            depositAmount: "0.000000",
            farmingBalance: "0.000000",
            ratePerSecond: "0.000000289351851800",
            startDate: null,
            lastUpdate: null
          };
        }
      );
      
      // Получаем базовую информацию о фарминге
      const farmingInfo = await getFarmingStatusWithFallback(user_id);
      
      // Трансформируем в формат status для фронтенда
      const farmingStatus = {
        isActive: farmingInfo.is_farming_active || false,
        depositAmount: farmingInfo.uni_deposit_amount || "0.000000",
        farmingBalance: farmingInfo.uni_farming_balance || "0.000000",
        ratePerSecond: farmingInfo.details?.rate_per_second || "0.000000289351851800",
        startDate: farmingInfo.uni_farming_start_timestamp,
        lastUpdate: farmingInfo.uni_farming_last_update
      };
      
      sendSuccess(res, farmingStatus);
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