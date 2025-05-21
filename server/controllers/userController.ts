/**
 * Консолидированный контроллер для обработки запросов, связанных с пользователями
 * 
 * Этот контроллер отвечает за обработку API-запросов, связанных с пользователями:
 * - получение данных пользователя
 * - создание нового пользователя
 * - обновление данных пользователя
 * - управление реферальными кодами
 * 
 * Поддерживает работу в fallback режиме при отсутствии соединения с БД
 */

import { Request, Response, NextFunction } from 'express';
import { userService } from '../services';
import { insertUserSchema, InsertUser } from '@shared/schema';
import { ZodError } from 'zod';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema, createUserSchema, guestRegistrationSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage-adapter';

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
 * с поддержкой работы в fallback режиме при отсутствии соединения с БД
 */
export const UserController = {
  /**
   * Получает информацию о пользователе по ID
   * @route GET /api/users/:id
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        throw new ValidationError('Некорректный ID пользователя', { id: 'Должен быть числом' });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок // from fallback logic
      const getUserByIdWithFallback = wrapServiceFunction(
        userService.getUserById.bind(userService),
        async (error, id) => {
          console.log(`[UserController] Возвращаем заглушку для пользователя по ID: ${id}`, error);
          
          // Возвращаем данные по умолчанию при отсутствии соединения с БД
          return {
            id: id,
            username: `user_${id}`,
            ref_code: `REF${id}${Math.floor(Math.random() * 1000)}`,
            telegram_id: null,
            telegram_username: null,
            guest_id: null,
            created_at: new Date().toISOString(),
            is_fallback: true
          };
        }
      );
      
      const user = await getUserByIdWithFallback(userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Получает информацию о пользователе по guest_id
   * @route GET /api/users/guest/:guest_id
   */
  async getUserByGuestId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestId = req.params.guest_id;
      
      if (!guestId) {
        throw new ValidationError('Не указан guest_id пользователя', { guest_id: 'Обязательный параметр' });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок // from fallback logic
      const getUserByGuestIdWithFallback = wrapServiceFunction(
        userService.getUserByGuestId.bind(userService),
        async (error, guestId) => {
          console.log(`[UserController] Возвращаем заглушку для пользователя по guest_id: ${guestId}`, error);
          
          // Возвращаем данные по умолчанию при отсутствии соединения с БД
          return {
            id: Math.floor(Math.random() * 1000),
            username: `guest_${guestId.substring(0, 6)}`,
            ref_code: `REF${guestId.substring(0, 6)}`,
            telegram_id: null,
            telegram_username: null,
            guest_id: guestId,
            created_at: new Date().toISOString(),
            is_fallback: true
          };
        }
      );
      
      const user = await getUserByGuestIdWithFallback(guestId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Регистрирует гостевого пользователя
   * @route POST /api/auth/guest/register
   */
  async registerGuestUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = guestRegistrationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      const { username, parent_ref_code } = validationResult.data;
      
      // Генерируем уникальный guest_id если не передан
      const guest_id = req.body.guest_id || uuidv4();
      
      // Заворачиваем вызов сервиса в обработчик ошибок // from fallback logic
      const registerGuestUserWithFallback = wrapServiceFunction(
        userService.registerGuestUser.bind(userService),
        async (error, guestId, username, parentRefCode) => {
          console.log(`[UserController] Возвращаем заглушку для регистрации гостя: ${guestId}`, error);
          
          // Генерируем случайный ID для гостевого пользователя
          const randomId = Math.floor(10000 + Math.random() * 90000);
          
          // Возвращаем заглушку при отсутствии соединения с БД
          return {
            id: randomId,
            username: username || `guest_${randomId}`,
            guest_id: guestId,
            ref_code: `REF${randomId}`,
            parent_ref_code: parentRefCode,
            created_at: new Date().toISOString(),
            is_fallback: true
          };
        }
      );
      
      const newUser = await registerGuestUserWithFallback(guest_id, username, parent_ref_code);
      sendSuccess(res, newUser);
    } catch (error) {
      next(error);
    }
  },
  /**
   * Генерирует временный реферальный код для аварийного режима
   */
  generateTempRefCode(): Promise<string> {
    const randomNum = Math.floor(Math.random() * 1000000);
    return Promise.resolve(`REF${randomNum}`);
  },
  /**
   * Функция регистрации гостевого пользователя с поддержкой fallback
   */
  async _registerGuestUserWithFallback(guestId: string | null, referrerCode: string | null, airdropMode: boolean): Promise<any> {
    try {
      // Сначала проверяем, существует ли уже пользователь с таким guest_id
      if (guestId) {
        const existingUser = await userService.getUserByGuestId(guestId);
        if (existingUser) {
          console.log(`[UserController] Пользователь с guest_id: ${guestId} уже существует`);
          return existingUser;
        }
      }
      
      // Находим реферера, если указан код
      let referrerId = null;
      if (referrerCode) {
        const referrer = await userService.getUserByRefCode(referrerCode);
        if (referrer) {
          referrerId = referrer.id;
          console.log(`[UserController] Найден реферал с кодом ${referrerCode}, ID: ${referrerId}`);
        }
      }
      
      // Создаем нового пользователя
      const newUser = await userService.createUser({
        guest_id: guestId || null,
        username: `guest_${Date.now()}`,
        ref_code: await userService.generateRefCode(),
        telegram_id: null,
        wallet: null,
        ton_wallet_address: null,
        parent_ref_code: referrerCode
      } as InsertUser);
      
      return newUser;
    } catch (error) {
      console.log(`[UserController] Создаем временного пользователя с guest_id: ${guestId}`, error);
      
      try {
        // Проверяем, существует ли пользователь в MemStorage
        const memStorage = storage.memStorage;
        const existingUser = guestId ? await memStorage.getUserByGuestId(guestId) : undefined;
        
        if (existingUser) {
          console.log(`[UserController] Пользователь с guest_id: ${guestId} уже существует в MemStorage`);
          return existingUser;
        }
        
        // Для fallback режима просто используем referrerCode напрямую,
        // так как мы не можем проверить его валидность в БД
        console.log(`[UserController] Используем referrerCode=${referrerCode} напрямую в fallback режиме`);
        
        // Создаем временного пользователя в MemStorage
        const newUser = await memStorage.createUser({
          guest_id: guestId,
          username: `guest_${Date.now()}`,
          ref_code: null, // Будет сгенерирован автоматически
          telegram_id: null,
          parent_ref_code: referrerCode
        });
        
        return {
          ...newUser,
          is_fallback: true,
          message: 'Временный аккаунт создан'
        };
      } catch (memError) {
        console.error(`[UserController] Ошибка создания пользователя в MemStorage:`, memError);
        
        // Если не удалось создать в MemStorage, возвращаем объект напрямую
        const temporaryId = Math.floor(Math.random() * 1000000) + 1;
        return {
          id: temporaryId,
          username: `guest_${temporaryId}`,
          ref_code: `REF${temporaryId}`,
          telegram_id: null,
          wallet: null,
          ton_wallet_address: null,
          guest_id: guestId || `temp_${temporaryId}`,
          created_at: new Date().toISOString(),
          parent_ref_code: referrerCode,
          is_fallback: true,
          message: 'Временный аккаунт создан (аварийный режим)'
        };
      }
    }
  },

  /**
   * Регистрирует гостевого пользователя
   * с поддержкой работы при отсутствии соединения с БД
   * @route POST /api/users/register-guest
   */
  async registerGuestUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = guestRegistrationSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { guest_id, referrer_code, airdrop_mode } = validationResult.data;
      
      // Переконвертуємо типи, щоб уникнути помилок типізації
      const guestId = guest_id || null;
      const refCode = referrer_code || null;
      const airdropMode = !!airdrop_mode; // Конвертуємо до boolean
      
      const result = await this._registerGuestUserWithFallback(guestId, refCode, airdropMode);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Функция восстановления сессии с поддержкой fallback
   */
  async _restoreSessionWithFallback(guestId: string | null, telegramData: any): Promise<any> {
    try {
      let user;
      
      if (guestId) {
        user = await userService.getUserByGuestId(guestId);
      } else if (telegramData && telegramData.id) {
        user = await userService.getUserByTelegramId(telegramData.id);
      }
      
      if (!user) {
        throw new Error('Пользователь не найден');
      }
      
      return {
        user,
        session_id: `sess_${uuidv4()}`,
        is_new_user: false
      };
    } catch (error) {
      console.log(`[UserController] Возвращаем заглушку для восстановления сессии`, error);
      
      // Создаем временную сессию
      const temporaryId = Math.floor(Math.random() * 1000000) + 1;
      return {
        user: {
          id: temporaryId,
          username: `temp_${temporaryId}`,
          ref_code: `REF${temporaryId}`,
          telegram_id: telegramData ? 12345678 : null,
          wallet: null,
          ton_wallet_address: null,
          guest_id: guestId || uuidv4(),
          created_at: new Date().toISOString(),
          parent_ref_code: null,
          is_fallback: true
        },
        session_id: `sess_${uuidv4()}`,
        is_new_user: false,
        message: 'Временная сессия создана из-за недоступности базы данных'
      };
    }
  },

  /**
   * Восстанавливает сессию пользователя по guest_id или telegram_data
   * с поддержкой работы при отсутствии соединения с БД
   * @route POST /api/users/restore-session
   */
  async restoreSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { guest_id, telegram_data } = req.body;
      
      if (!guest_id && !telegram_data) {
        throw new ValidationError('Не предоставлены данные для восстановления сессии', { 
          data: 'Необходимо предоставить guest_id или telegram_data' 
        });
      }
      
      // Переконвертуємо типи для уникнення помилок типізації
      const guestId = guest_id || null;
      
      const sessionData = await this._restoreSessionWithFallback(guestId, telegram_data);
      sendSuccess(res, sessionData);
    } catch (error) {
      next(error);
    }
  },
  /**
   * Получает информацию о пользователе по ID
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        sendError(res, 'ID пользователя должен быть числом', 'INVALID_USER_ID', 400);
        return;
      }
      
      // Обертка сервісної функції для обробки помилок
      const getUserById = wrapServiceFunction(
        userService.getUserById.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при получении пользователя:', error);
          throw error;
        }
      );
      
      const user = await getUserById(userId);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 'USER_NOT_FOUND', 404);
        return;
      }
      
      sendSuccess(res, user);
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
    }
  },
  
  /**
   * Получает информацию о пользователе по имени пользователя
   */
  async getUserByUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      
      if (!username) {
        sendError(res, 'Имя пользователя не указано', 'MISSING_USERNAME', 400);
        return;
      }
      
      // Обертка сервісної функції для обробки помилок
      const getUserByUsername = wrapServiceFunction(
        userService.getUserByUsername.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при получении пользователя по имени:', error);
          throw error;
        }
      );
      
      const user = await getUserByUsername(username);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 'USER_NOT_FOUND', 404);
        return;
      }
      
      sendSuccess(res, user);
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по имени:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
    }
  },
  
  /**
   * Получает информацию о пользователе по гостевому ID
   */
  async getUserByGuestId(req: Request, res: Response): Promise<void> {
    try {
      const { guestId } = req.params;
      
      if (!guestId) {
        sendError(res, 'Гостевой ID не указан', 400, 'MISSING_GUEST_ID');
        return;
      }
      
      // Обертка сервісної функції для обробки помилок
      const getUserByGuestId = wrapServiceFunction(
        userService.getUserByGuestId.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при получении пользователя по гостевому ID:', error);
          throw error;
        }
      );
      
      const user = await getUserByGuestId(guestId);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 404, 'USER_NOT_FOUND');
        return;
      }
      
      sendSuccess(res, user);
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по гостевому ID:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
    }
  },
  
  /**
   * Получает информацию о пользователе по реферальному коду
   */
  async getUserByRefCode(req: Request, res: Response): Promise<void> {
    try {
      const { refCode } = req.params;
      
      if (!refCode) {
        sendError(res, 'Реферальный код не указан', 400, 'MISSING_REF_CODE');
        return;
      }
      
      // Обертка сервісної функції для обробки помилок
      const getUserByRefCode = wrapServiceFunction(
        userService.getUserByRefCode.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при получении пользователя по реферальному коду:', error);
          throw error;
        }
      );
      
      const user = await getUserByRefCode(refCode);
      
      if (!user) {
        sendError(res, 'Пользователь с указанным реферальным кодом не найден', 404, 'USER_NOT_FOUND');
        return;
      }
      
      sendSuccess(res, user);
    } catch (err) {
      console.error('[UserController] Ошибка при получении пользователя по реферальному коду:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
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
        // Обертка сервисной функции
        const generateRefCode = wrapServiceFunction(
          userService.generateRefCode.bind(userService),
          async (error) => {
            console.error('[UserController] Ошибка при генерации реферального кода:', error);
            throw error;
          }
        );
        
        userData.ref_code = await generateRefCode();
      }
      
      // Обертка сервисной функции для создания пользователя
      const createUser = wrapServiceFunction(
        userService.createUser.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при создании пользователя:', error);
          throw error;
        }
      );
      
      const newUser = await createUser(userData);
      
      sendSuccess(res, newUser, 201);
    } catch (err) {
      console.error('[UserController] Ошибка при создании пользователя:', err);
      
      // Обрабатываем ошибки валидации Zod
      if (err instanceof ZodError) {
        sendError(res, 'Ошибка валидации данных', 400, handleZodError(err));
        return;
      }
      
      sendServerError(res, 'Внутренняя ошибка сервера');
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
        sendError(res, 'ID пользователя должен быть числом', 400, 'INVALID_USER_ID');
        return;
      }
      
      if (!refCode) {
        sendError(res, 'Реферальный код не указан', 400, 'MISSING_REF_CODE');
        return;
      }
      
      // Обертка сервисной функции для обновления реферального кода
      const updateUserRefCode = wrapServiceFunction(
        userService.updateUserRefCode.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при обновлении реферального кода:', error);
          throw error;
        }
      );
      
      const updatedUser = await updateUserRefCode(userId, refCode);
      
      if (!updatedUser) {
        sendError(res, 'Пользователь не найден', 404, 'USER_NOT_FOUND');
        return;
      }
      
      sendSuccess(res, updatedUser);
    } catch (err) {
      console.error('[UserController] Ошибка при обновлении реферального кода:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
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
        sendError(res, 'ID пользователя должен быть числом', 400, 'INVALID_USER_ID');
        return;
      }
      
      if (!currencyType || !['uni', 'ton'].includes(currencyType)) {
        sendError(res, 'Неверный тип валюты. Допустимые значения: uni, ton', 400, 'INVALID_CURRENCY_TYPE');
        return;
      }
      
      if (!amount || isNaN(parseFloat(amount))) {
        sendError(res, 'Сумма должна быть числом', 400, 'INVALID_AMOUNT');
        return;
      }
      
      // Обертка сервисной функции для обновления баланса
      const updateUserBalance = wrapServiceFunction(
        userService.updateUserBalance.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при обновлении баланса:', error);
          throw error;
        }
      );
      
      const updatedUser = await updateUserBalance(userId, currencyType, amount);
      
      if (!updatedUser) {
        sendError(res, 'Пользователь не найден', 404, 'USER_NOT_FOUND');
        return;
      }
      
      sendSuccess(res, updatedUser);
    } catch (err) {
      console.error('[UserController] Ошибка при обновлении баланса:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
    }
  },
  
  /**
   * Генерирует новый реферальный код
   */
  async generateRefCode(req: Request, res: Response): Promise<void> {
    try {
      // Обертка сервисной функции для генерации реферального кода
      const generateRefCode = wrapServiceFunction(
        userService.generateRefCode.bind(userService),
        async (error) => {
          console.error('[UserController] Ошибка при генерации реферального кода:', error);
          throw error;
        }
      );
      
      const refCode = await generateRefCode();
      sendSuccess(res, { refCode });
    } catch (err) {
      console.error('[UserController] Ошибка при генерации реферального кода:', err);
      sendServerError(res, 'Внутренняя ошибка сервера');
    }
  },

  /**
   * Получает информацию о текущем пользователе на основе сессии
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // В режиме разработки проверяем несколько источников ID пользователя
      let userId = null;
      
      if (process.env.NODE_ENV === 'development') {
        // 1. Сначала пробуем получить ID из заголовка x-development-user-id
        if (req.headers['x-development-user-id']) {
          userId = parseInt(req.headers['x-development-user-id'] as string, 10);
          console.log(`[UserController] Получен ID пользователя из заголовка x-development-user-id: ${userId}`);
        }
        
        // 2. Затем проверяем query параметр user_id
        if (!userId && req.query.user_id) {
          userId = parseInt(req.query.user_id as string, 10);
          console.log(`[UserController] Получен ID пользователя из query параметра user_id: ${userId}`);
        }
        
        // 3. Проверяем устаревший заголовок x-user-id для обратной совместимости
        if (!userId && req.headers['x-user-id']) {
          userId = parseInt(req.headers['x-user-id'] as string, 10);
          console.log(`[UserController] Получен ID пользователя из заголовка x-user-id: ${userId}`);
        }
      }
      
      // Если в режиме разработки не найден ID, или мы не в режиме разработки, 
      // пробуем стандартный путь через сессию
      if (!userId) {
        userId = req.session?.userId || (req as any).user?.id;
        console.log(`[UserController] Получен ID пользователя из сессии: ${userId}`);
      }
      
      // Проверяем валидность ID
      if (!userId || isNaN(userId)) {
        console.log(`[UserController] Ошибка аутентификации - userId: ${userId}, 
          isNaN: ${isNaN(userId)}, headers: ${JSON.stringify(req.headers)}`);
          
        sendError(res, 'Пользователь не аутентифицирован', 401, {
          code: 'USER_NOT_AUTHENTICATED',
          details: {
            session_exists: !!req.session,
            user_in_session: !!req.session?.userId,
            development_mode: process.env.NODE_ENV === 'development',
            dev_headers: {
              development_mode: !!req.headers['x-development-mode'],
              development_user_id: req.headers['x-development-user-id']
            }
          }
        });
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