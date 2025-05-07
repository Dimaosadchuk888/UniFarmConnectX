/**
 * Контроллер для работы с множественным UNI фармингом
 * 
 * Этот контроллер обрабатывает запросы к API, связанные с множественными
 * UNI-фарминг депозитами. Использует NewUniFarmingService для работы с данными.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { NewUniFarmingService } from '../services/newUniFarmingService';
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
      const farmingInfo = await NewUniFarmingService.getUserFarmingInfo(user_id);
      
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
    try {
      // Валидация входных данных
      const validationResult = createDepositSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      const { user_id, amount } = validationResult.data;
      
      // Создаем новый депозит
      const depositResult = await NewUniFarmingService.createUniFarmingDeposit(user_id, amount);
      
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
      const deposits = await NewUniFarmingService.getUserFarmingDeposits(user_id);
      
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
      
      // Обновляем и получаем баланс фарминга
      const updateResult = await NewUniFarmingService.calculateAndUpdateUserFarming(user_id);
      
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
      }
      
      // Если это какая-то другая ошибка
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера при обновлении баланса фарминга'
      });
    }
  }
}