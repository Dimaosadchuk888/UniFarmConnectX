import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { getUserParamsSchema } from '../validators/schemas';
import { ZodError } from 'zod';
import BigNumber from 'bignumber.js';

/**
 * Контроллер для работы с пользователями
 */
export class UserController {
  /**
   * Получает информацию о пользователе по ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      // Валидация параметров запроса
      const validationResult = getUserParamsSchema.safeParse(req.params);
      if (!validationResult.success) {
        return sendError(res, 'Invalid user ID', 400, validationResult.error.format());
      }

      const userId = parseInt(req.params.id);
      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, user);
    } catch (error) {
      console.error('Error in getUserById:', error);
      sendServerError(res, error);
    }
  }

  /**
   * Создает нового пользователя
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Здесь должна быть валидация тела запроса
      const userData = req.body;
      
      // Проверка на существование пользователя с таким telegram_id
      if (userData.telegram_id) {
        const existingUser = await UserService.getUserByTelegramId(userData.telegram_id);
        if (existingUser) {
          return sendError(res, 'User with this Telegram ID already exists', 409);
        }
      }

      const newUser = await UserService.createUser(userData);
      sendSuccess(res, newUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Invalid user data', 400, error.format());
      }
      sendServerError(res, error);
    }
  }

  /**
   * Обновляет данные пользователя
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'params');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const userData = req.body;
      const updatedUser = await UserService.updateUser(userId, userData);

      if (!updatedUser) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, updatedUser);
    } catch (error) {
      sendServerError(res, error);
    }
  }

  /**
   * Получает информацию о балансе пользователя
   */
  static async getUserBalance(req: Request, res: Response): Promise<void> {
    try {
      // Получаем user_id из параметров запроса
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Форматируем баланс для отображения
      const balanceUni = user.balance_uni ? new BigNumber(user.balance_uni).toFixed(3) : '0.000';
      const balanceTon = user.balance_ton ? new BigNumber(user.balance_ton).toFixed(5) : '0.00000';

      sendSuccess(res, {
        balance_uni: balanceUni,
        balance_ton: balanceTon,
        // Добавляем дополнительные данные для фарминга (если есть)
        uni_farming_active: user.uni_deposit_amount && 
                          new BigNumber(user.uni_deposit_amount).gt(0) ? true : false,
        uni_deposit_amount: user.uni_deposit_amount ? 
                          new BigNumber(user.uni_deposit_amount).toFixed(3) : '0.000',
        uni_farming_balance: user.uni_farming_balance ? 
                           new BigNumber(user.uni_farming_balance).toFixed(3) : '0.000'
      });
    } catch (error) {
      console.error('Error in getUserBalance:', error);
      sendServerError(res, error);
    }
  }
}