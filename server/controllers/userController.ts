import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { getUserParamsSchema } from '../validators/schemas';
import { ZodError } from 'zod';

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
}