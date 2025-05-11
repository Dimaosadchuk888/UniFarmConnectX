/**
 * Контроллер для работы с множественным UNI фармингом
 * 
 * Этот контроллер обрабатывает запросы к API, связанные с множественными
 * UNI-фарминг депозитами. Использует NewUniFarmingService для работы с данными.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { newUniFarmingService, validationService } from '../services';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { formatZodErrors } from '../utils/validationUtils';

// Схема для валидации запроса с user_id
const userIdSchema = z.object({
  user_id: z.coerce.number()
});

// Схема для валидации запроса на создание депозита
const createDepositSchema = z.object({
  user_id: z.coerce.number(),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Сумма должна быть положительным числом'
  })
});

/**
 * Контроллер для множественных UNI фарминг депозитов
 */
export class NewUniFarmingController {
  /**
   * Получает информацию о всех UNI фарминг-депозитах пользователя
   * @route GET /api/new-uni-farming/info
   */
  static async getUserFarmingInfo(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации параметров', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Получаем информацию о фарминге
      const farmingInfo = await newUniFarmingService.getUserFarmingInfo(user_id);
      
      res.json({
        success: true,
        data: {
          is_active: farmingInfo.isActive,
          total_deposit_amount: farmingInfo.totalDepositAmount,
          deposit_count: farmingInfo.depositCount,
          total_rate_per_second: farmingInfo.totalRatePerSecond,
          daily_income_uni: farmingInfo.dailyIncomeUni,
          deposits: farmingInfo.deposits
        }
      });
    } catch (error) {
      console.error('Ошибка в getUserFarmingInfo:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      } else if (error instanceof Error) {
        console.error(error.stack);
      }
      
      // Если это какая-то другая ошибка
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при получении информации о фарминге'
      });
    }
  }

  /**
   * Создает новый UNI фарминг-депозит
   * @route POST /api/new-uni-farming/deposit
   */
  static async createDeposit(req: Request, res: Response): Promise<void> {
    console.log('[NewUniFarmingController] 🔎 createDeposit - Запрос на создание депозита:', {
      path: req.path,
      body: JSON.stringify(req.body)
    });
    
    try {
      // Валидация входных данных с помощью Zod для базовой проверки структуры
      const validationResult = createDepositSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error('[NewUniFarmingController] ❌ Ошибка валидации данных:', formatZodErrors(validationResult.error));
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      const { user_id, amount } = validationResult.data;
      console.log('[NewUniFarmingController] ✅ Валидация пройдена, данные:', { user_id, amount });
      
      // Используем централизованный ValidationService для проверки финансовой операции
      const farmingOperationValidation = validationService.validateFarmingOperation(
        user_id,
        amount,
        'deposit',
        req.headers['x-idempotency-key'] as string
      );
      
      if (!farmingOperationValidation.success) {
        throw new ValidationError(
          farmingOperationValidation.error || 'Невалидные данные для фарминга',
          { 
            'amount': String(amount), 
            'user_id': String(user_id) 
          }
        );
      }
      
      // Проверяем повторную операцию с тем же ключом идемпотентности
      const idempotencyKey = req.headers['x-idempotency-key'] as string;
      if (idempotencyKey && validationService.isOperationDuplicate(idempotencyKey)) {
        console.log(`[NewUniFarmingController] Дублирующая операция депозита с ключом: ${idempotencyKey}`);
        
        // Если операция уже была выполнена, возвращаем тот же результат
        res.json({
          success: true,
          data: {
            message: 'Депозит уже был создан ранее с тем же ключом идемпотентности',
            deposit_id: null,
            duplicate: true
          }
        });
        return;
      }
      
      // Создаем новый депозит
      const depositResult = await newUniFarmingService.createUniFarmingDeposit(
        user_id, 
        validationService.validateAndParseNumber(amount, {
          min: 100,  // Минимальная сумма депозита 100 UNI
          max: 10000000,  // Максимальная сумма депозита 10,000,000 UNI
          currency: 'UNI',
          precision: 6
        })
      );
      
      // Если есть ключ идемпотентности, регистрируем завершенную операцию
      if (idempotencyKey) {
        validationService.registerCompletedOperation(idempotencyKey, depositResult);
      }
      
      if (depositResult.success) {
        res.json({
          success: true,
          data: depositResult
        });
      } else {
        res.status(400).json({
          success: false,
          message: depositResult.message || 'Ошибка при создании депозита'
        });
      }
    } catch (error) {
      console.error('Ошибка в createDeposit:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      } else if (error instanceof Error) {
        console.error(error.stack);
      }
      
      // Если это какая-то другая ошибка
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при создании депозита'
      });
    }
  }

  /**
   * Получает список активных депозитов пользователя
   * @route GET /api/new-uni-farming/deposits
   */
  static async getUserDeposits(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации параметров', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Получаем депозиты
      const deposits = await newUniFarmingService.getUserFarmingDeposits(user_id);
      
      res.json({
        success: true,
        data: deposits
      });
    } catch (error) {
      console.error('Ошибка в getUserDeposits:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      } else if (error instanceof Error) {
        console.error(error.stack);
      }
      
      // Если это какая-то другая ошибка
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при получении депозитов'
      });
    }
  }

  /**
   * Обновляет и рассчитывает накопленную прибыль пользователя
   * @route GET /api/new-uni-farming/update-balance
   */
  static async updateUserFarmingBalance(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = userIdSchema.safeParse(req.query);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации параметров', formatZodErrors(validationResult.error));
      }
      
      const { user_id } = validationResult.data;
      
      // Генерируем ключ идемпотентности для обновления баланса
      // Используем временную метку и ID пользователя для уникальности
      const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
      const idempotencyKey = req.headers['x-idempotency-key'] as string || 
        validationService.generateIdempotencyKey({
          userId: user_id,
          operation: 'update-farming-balance',
          timestamp: currentHour
        });
      
      // Проверяем, было ли уже обновление в этом часу
      if (validationService.isOperationDuplicate(idempotencyKey)) {
        console.log(`[NewUniFarmingController] Обновление баланса уже выполнялось в этом часу для пользователя ${user_id}`);
        
        res.json({
          success: true,
          data: {
            message: 'Обновление баланса уже было выполнено в текущем часу',
            duplicate: true,
            total_deposit_amount: '0.000000',
            total_rate_per_second: '0.000000',
            earned_this_update: '0.000000',
            deposit_count: 0
          }
        });
        return;
      }
      
      // Обновляем и получаем баланс фарминга
      const updateResult = await newUniFarmingService.calculateAndUpdateUserFarming(user_id);
      
      // Регистрируем выполненную операцию обновления
      validationService.registerCompletedOperation(idempotencyKey, updateResult);
      
      res.json({
        success: true,
        data: {
          total_deposit_amount: updateResult.totalDepositAmount,
          total_rate_per_second: updateResult.totalRatePerSecond,
          earned_this_update: updateResult.earnedThisUpdate,
          deposit_count: updateResult.depositCount
        }
      });
    } catch (error) {
      console.error('Ошибка в updateUserFarmingBalance:', error);
      
      // Обрабатываем ошибки валидации и Not Found непосредственно здесь
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          message: error.message,
          errors: error.errors || null
        });
        return;
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message
        });
        return;
      } else if (error instanceof Error) {
        console.error(error.stack);
      }
      
      // Если это какая-то другая ошибка
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при обновлении баланса фарминга'
      });
    }
  }
}