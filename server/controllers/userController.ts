/**
 * Контроллер для обработки запросов, связанных с пользователями
 * 
 * Этот контроллер отвечает за обработку API-запросов, связанных с пользователями:
 * - получение данных пользователя
 * - создание нового пользователя
 * - обновление данных пользователя
 * - управление реферальными кодами
 */

import { Request, Response } from 'express';
import { userService } from '../services';
import { insertUserSchema } from '@shared/schema';
import { ZodError } from 'zod';

/**
 * Стандартизированная структура ответа API
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Создает стандартизированный успешный ответ
 */
function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

/**
 * Создает стандартизированный ответ с ошибкой
 */
function error(message: string, code?: string, details?: any): ApiResponse<any> {
  return {
    success: false,
    error: {
      message,
      code,
      details
    }
  };
}

/**
 * Обрабатывает ошибки валидации Zod
 */
function handleZodError(err: ZodError): ApiResponse<any> {
  return error(
    'Ошибка валидации данных',
    'VALIDATION_ERROR',
    err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }))
  );
}

/**
 * Предоставляет методы контроллера в виде объекта
 */
export const UserController = {
  /**
   * Получает информацию о пользователе по ID
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        res.status(400).json(error('ID пользователя должен быть числом', 'INVALID_USER_ID'));
        return;
      }
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(user));
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Получает информацию о пользователе по имени пользователя
   */
  async getUserByUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      
      if (!username) {
        res.status(400).json(error('Имя пользователя не указано', 'MISSING_USERNAME'));
        return;
      }
      
      const user = await userService.getUserByUsername(username);
      
      if (!user) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(user));
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по имени:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Получает информацию о пользователе по гостевому ID
   */
  async getUserByGuestId(req: Request, res: Response): Promise<void> {
    try {
      const { guestId } = req.params;
      
      if (!guestId) {
        res.status(400).json(error('Гостевой ID не указан', 'MISSING_GUEST_ID'));
        return;
      }
      
      const user = await userService.getUserByGuestId(guestId);
      
      if (!user) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(user));
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по гостевому ID:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Получает информацию о пользователе по реферальному коду
   */
  async getUserByRefCode(req: Request, res: Response): Promise<void> {
    try {
      const { refCode } = req.params;
      
      if (!refCode) {
        res.status(400).json(error('Реферальный код не указан', 'MISSING_REF_CODE'));
        return;
      }
      
      const user = await userService.getUserByRefCode(refCode);
      
      if (!user) {
        res.status(404).json(error('Пользователь с указанным реферальным кодом не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(user));
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по реферальному коду:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Создает нового пользователя
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Валидируем данные пользователя через Zod
      const userData = insertUserSchema.parse(req.body);
      
      // Если реферальный код не указан, генерируем новый
      if (!userData.ref_code) {
        userData.ref_code = await userService.generateRefCode();
      }
      
      const newUser = await userService.createUser(userData);
      
      res.status(201).json(success(newUser));
    } catch (err) {
      console.error('[UserController] Ошибка при создании пользователя:', err);
      
      // Обрабатываем ошибки валидации Zod
      if (err instanceof ZodError) {
        res.status(400).json(handleZodError(err));
        return;
      }
      
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Обновляет реферальный код пользователя
   */
  async updateRefCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const { refCode } = req.body;
      
      if (isNaN(userId)) {
        res.status(400).json(error('ID пользователя должен быть числом', 'INVALID_USER_ID'));
        return;
      }
      
      if (!refCode) {
        res.status(400).json(error('Реферальный код не указан', 'MISSING_REF_CODE'));
        return;
      }
      
      const updatedUser = await userService.updateUserRefCode(userId, refCode);
      
      if (!updatedUser) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(updatedUser));
    } catch (err) {
      console.error('[UserController] Ошибка при обновлении реферального кода:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Обновляет баланс пользователя
   */
  async updateBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const { currencyType, amount } = req.body;
      
      if (isNaN(userId)) {
        res.status(400).json(error('ID пользователя должен быть числом', 'INVALID_USER_ID'));
        return;
      }
      
      if (!currencyType || !['uni', 'ton'].includes(currencyType)) {
        res.status(400).json(error('Неверный тип валюты. Допустимые значения: uni, ton', 'INVALID_CURRENCY_TYPE'));
        return;
      }
      
      if (!amount || isNaN(parseFloat(amount))) {
        res.status(400).json(error('Сумма должна быть числом', 'INVALID_AMOUNT'));
        return;
      }
      
      const updatedUser = await userService.updateUserBalance(userId, currencyType, amount);
      
      if (!updatedUser) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(updatedUser));
    } catch (err) {
      console.error('[UserController] Ошибка при обновлении баланса:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },
  
  /**
   * Генерирует новый реферальный код
   */
  async generateRefCode(req: Request, res: Response): Promise<void> {
    try {
      const refCode = await userService.generateRefCode();
      res.json(success({ refCode }));
    } catch (err) {
      console.error('[UserController] Ошибка при генерации реферального кода:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  },

  /**
   * Получает информацию о текущем пользователе на основе сессии
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // Получаем ID пользователя из сессии или из заголовка
      const userId = req.session?.userId || 
                   parseInt(req.headers['x-user-id'] as string, 10);
      
      if (!userId || isNaN(userId)) {
        res.status(401).json(error('Пользователь не аутентифицирован', 'USER_NOT_AUTHENTICATED'));
        return;
      }
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        res.status(404).json(error('Пользователь не найден', 'USER_NOT_FOUND'));
        return;
      }
      
      res.json(success(user));
    } catch (err) {
      console.error('[UserController] Ошибка при получении текущего пользователя:', err);
      res.status(500).json(error('Внутренняя ошибка сервера', 'SERVER_ERROR'));
    }
  }
};