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
import { userService, authService } from '../services';
import { insertUserSchema, InsertUser } from '@shared/schema';
import { adaptedSendSuccess as sendSuccess, adaptedSendError as sendError, adaptedSendServerError as sendServerError } from '../utils/apiResponseAdapter';
import { createUserFallback, createGuestUserFallback, createRegisteredGuestFallback } from '../utils/userAdapter';
import { wrapServiceFunction } from '../db-service-wrapper';
import { ensureNumber, ensureDate } from '../utils/typeFixers';
import { ZodError } from 'zod';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema, createUserSchema, guestRegistrationSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
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
      
      // Використовуємо сервіс для отримання даних користувача
      const getUserByIdSafe = wrapServiceFunction(
        userService.getUserById.bind(userService),
        async (error) => {
          console.error(`[UserController] Помилка при отриманні користувача:`, error);
          return null; // В продакшн-версії не використовуємо заглушки
        }
      );
      
      // Отримуємо дані користувача з бази даних
      const dbUser = await userService.getUserById(userId);
      
      // Адаптуємо користувача для відповіді API з належним форматуванням дат
      const apiUser = dbUser ? {
        ...dbUser,
        telegram_id: dbUser.telegram_id ? Number(dbUser.telegram_id) : null,
        checkin_streak: dbUser.checkin_streak !== undefined && dbUser.checkin_streak !== null ? 
          Number(dbUser.checkin_streak) : 0,
        created_at: ensureDate(dbUser.created_at)
        // Додаткові поля оброблюються, якщо вони присутні
      } : null;
      
      sendSuccess(res, apiUser, 'Користувач успішно знайдений', 200);
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
          const user = createGuestUserFallback(guestId);
          
          // Согласно комментарию в db-service-wrapper.ts используем прагматичный подход с "as unknown as"
          // для обеспечения совместимости типов между сервисами и контроллерами
          return user as unknown as any;
        }
      );
      
      const user = await getUserByGuestIdWithFallback(guestId);
      sendSuccess(res, user, 'Користувач за guest_id успішно знайдений', 200);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Регистрирует гостевого пользователя (базовая версия)
   * @route POST /api/auth/guest/register
   */
  async registerGuestUserBase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = guestRegistrationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }
      
      // Готуємо дані з валідованої схеми
      const { guest_id: validatedGuestId, referrer_code } = validationResult.data;
      // Використовуємо дані з запиту для зворотної сумісності (username може передаватися поза схемою)
      const username = req.body.username || `guest_${Math.floor(1000 + Math.random() * 9000)}`;
      const parent_ref_code = referrer_code;
      
      // Генерируем уникальный guest_id если не передан
      const guest_id = req.body.guest_id || uuidv4();
      
      // Використовуємо сервіс для реєстрації гостьового користувача
      const registerGuestUserSafe = wrapServiceFunction(
        userService.registerGuestUser.bind(userService),
        async (error) => {
          console.error(`[UserController] Помилка при реєстрації гостьового користувача:`, error);
          throw new Error('Не вдалося зареєструвати гостьового користувача');
        }
      );
      
      // Реєструємо нового гостьового користувача через сервіс авторизації
      const newUser = await authService.registerGuestUser({
        guest_id, 
        username,
        parent_ref_code: parent_ref_code ? parent_ref_code : undefined
      });
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
          created_at: ensureDate(new Date().toISOString()),
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
  async registerGuestUserWithFallback(req: Request, res: Response, next: NextFunction): Promise<void> {
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
          created_at: ensureDate(new Date().toISOString()),
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
        sendError(res, 'Некорректный ID пользователя', 400);
        return;
      }
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 404);
        return;
      }
      
      sendSuccess(res, user);
    } catch (error) {
      console.error('[UserController] Ошибка при получении пользователя:', error);
      sendServerError(res, 'Ошибка при получении данных пользователя');
    }
  },
  
  /**
   * Создает нового пользователя
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Валидация входных данных с помощью схемы Zod
      const validationResult = createUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        sendError(res, 'Ошибка валидации данных', 400, formatZodErrors(validationResult.error));
        return;
      }
      
      const userData = validationResult.data;
      
      // Проверка уникальности username
      if (userData.username) {
        const existingUser = await userService.getUserByUsername(userData.username);
        if (existingUser) {
          sendError(res, 'Пользователь с таким username уже существует', 409);
          return;
        }
      }
      
      // Если передан Telegram ID, проверяем его уникальность
      if (userData.telegram_id) {
        const existingUser = await userService.getUserByTelegramId(userData.telegram_id);
        if (existingUser) {
          sendError(res, 'Пользователь с таким Telegram ID уже существует', 409);
          return;
        }
      }
      
      // Создаем пользователя
      const newUser = await userService.createUser(userData);
      
      // Генерируем реферальный код, если не был передан
      if (!newUser.ref_code) {
        // Генеруємо реферальний код та одразу застосовуємо його
        newUser.ref_code = await userService.generateRefCode();
        // Оновлюємо реферальний код через спеціалізований метод
        await userService.updateUserRefCode(newUser.id, newUser.ref_code);
      }
      
      sendSuccess(res, newUser, 'Пользователь успешно создан', 201);
    } catch (error) {
      console.error('[UserController] Ошибка при создании пользователя:', error);
      sendServerError(res, 'Ошибка при создании пользователя');
    }
  },
  
  /**
   * Обновляет информацию о пользователе
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        sendError(res, 'Некорректный ID пользователя', 400);
        return;
      }
      
      // Проверяем существование пользователя
      const user = await userService.getUserById(userId);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 404);
        return;
      }
      
      // Временное решение - используем обходной путь через обновление реферального кода
      // В будущем этот код будет заменен на полноценный метод updateUser
      const userData = req.body;
      let updatedUser = user;
      
      // Если есть ref_code в данных для обновления, используем этот метод
      if (userData.ref_code) {
        updatedUser = await userService.updateUserRefCode(userId, userData.ref_code) || user;
      }
      
      sendSuccess(res, updatedUser, 'Данные пользователя обновлены');
    } catch (error) {
      console.error('[UserController] Ошибка при обновлении пользователя:', error);
      sendServerError(res, 'Ошибка при обновлении данных пользователя');
    }
  },
  
  /**
   * Получает реферальный код пользователя
   */
  async getRefCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        sendError(res, 'Некорректный ID пользователя', 400);
        return;
      }
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        sendError(res, 'Пользователь не найден', 404);
        return;
      }
      
      sendSuccess(res, {
        user_id: user.id,
        ref_code: user.ref_code
      });
    } catch (error) {
      console.error('[UserController] Ошибка при получении реферального кода:', error);
      sendServerError(res, 'Ошибка при получении реферального кода');
    }
  },
  
  /**
   * Проверяет доступность username
   */
  async checkUsername(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.query;
      
      if (!username || typeof username !== 'string') {
        sendError(res, 'Не указан username', 400);
        return;
      }
      
      const user = await userService.getUserByUsername(username);
      
      sendSuccess(res, {
        username,
        available: !user
      });
    } catch (error) {
      console.error('[UserController] Ошибка при проверке username:', error);
      sendServerError(res, 'Ошибка при проверке доступности username');
    }
  },
  
  /**
   * Добавляет TON кошелек пользователю
   */
  async addTonWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      
      if (isNaN(userId)) {
        sendError(res, 'Некорректный ID пользователя', 400);
        return;
      }
      
      const { ton_wallet_address } = req.body;
      
      if (!ton_wallet_address) {
        sendError(res, 'Не указан адрес TON кошелька', 400);
        return;
      }
      
      // Проверяем формат адреса TON кошелька (примерная валидация)
      const tonAddressRegex = /^(?:UQ|EQ)[A-Za-z0-9_-]{46,48}$/;
      if (!tonAddressRegex.test(ton_wallet_address)) {
        sendError(res, 'Некорректный формат адреса TON кошелька', 400);
        return;
      }
      
      // Обновляем пользователя
      const updatedUser = await userService.updateUser(userId, { ton_wallet_address });
      
      sendSuccess(res, updatedUser, 'TON кошелек успешно добавлен');
    } catch (error) {
      console.error('[UserController] Ошибка при добавлении TON кошелька:', error);
      sendServerError(res, 'Ошибка при добавлении TON кошелька');
    }
  }
};