import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess } from '../utils/responseUtils';
import { ValidationError } from '../middleware/errorHandler';
import { userIdSchema, registerUserSchema, guestRegistrationSchema } from '../validators/schemas';
import { formatZodErrors } from '../utils/validationUtils';
import { wrapServiceFunction } from '../db-service-wrapper';
import { v4 as uuidv4 } from 'uuid';

/**
 * Контроллер для работы с пользователями с поддержкой fallback режима
 */
export class UserControllerFallback {
  /**
   * Получает информацию о пользователе по ID
   * @route GET /api/users/:id
   */
  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        throw new ValidationError('Некорректный ID пользователя', { id: 'Должен быть числом' });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getUserByIdWithFallback = wrapServiceFunction(
        UserService.getUserById.bind(UserService),
        async (error, id) => {
          console.log(`[UserControllerFallback] Возвращаем заглушку для пользователя по ID: ${id}`, error);
          
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
  }

  /**
   * Получает информацию о пользователе по guest_id
   * @route GET /api/users/guest/:guest_id
   */
  static async getUserByGuestId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const guestId = req.params.guest_id;
      
      if (!guestId || typeof guestId !== 'string') {
        throw new ValidationError('Некорректный guest_id', { guest_id: 'Должен быть строкой' });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const getUserByGuestIdWithFallback = wrapServiceFunction(
        UserService.getUserByGuestId.bind(UserService),
        async (error, guestId) => {
          console.log(`[UserControllerFallback] Не найден пользователь по guest_id: ${guestId}`, error);
          
          // Возвращаем null при отсутствии соединения с БД, чтобы клиент мог создать нового пользователя
          return null;
        }
      );
      
      const user = await getUserByGuestIdWithFallback(guestId);
      
      if (!user) {
        // Если пользователь не найден, возвращаем 404
        res.status(404).json({
          success: false,
          error: {
            message: 'Пользователь не найден',
            code: 'USER_NOT_FOUND'
          }
        });
        return;
      }
      
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Регистрирует нового пользователя в гостевом режиме
   * @route POST /api/users/guest/register
   */
  static async registerGuestUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных
      const validationResult = guestRegistrationSchema.safeParse(req.body);

      if (!validationResult.success) {
        throw new ValidationError('Ошибка валидации данных', formatZodErrors(validationResult.error));
      }

      const { guest_id, referrer_code, airdrop_mode } = validationResult.data;

      // Заворачиваем вызов сервиса в обработчик ошибок
      const registerGuestUserWithFallback = wrapServiceFunction(
        UserService.registerGuestUser.bind(UserService),
        async (error, guestId, referrerCode, airdropMode) => {
          console.log(`[UserControllerFallback] Создаем временного пользователя с guest_id: ${guestId}`, error);
          
          // Создаем временного пользователя с минимальными данными
          const temporaryId = Math.floor(Math.random() * 1000000) + 1;
          return {
            id: temporaryId,
            username: `guest_${temporaryId}`,
            ref_code: `REF${temporaryId}`,
            telegram_id: null,
            telegram_username: null,
            guest_id: guestId,
            created_at: new Date().toISOString(),
            referrer_id: null,
            is_fallback: true,
            message: 'Временный аккаунт создан'
          };
        }
      );
      
      const result = await registerGuestUserWithFallback(guest_id, referrer_code, airdrop_mode);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Восстанавливает сессию пользователя
   * @route POST /api/session/restore
   */
  static async restoreSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { guest_id, telegram_data } = req.body;
      
      if (!guest_id && !telegram_data) {
        throw new ValidationError('Не предоставлены данные для восстановления сессии', { 
          data: 'Необходимо предоставить guest_id или telegram_data' 
        });
      }
      
      // Заворачиваем вызов сервиса в обработчик ошибок
      const restoreSessionWithFallback = wrapServiceFunction(
        UserService.restoreSession.bind(UserService),
        async (error, guestId, telegramData) => {
          console.log(`[UserControllerFallback] Возвращаем заглушку для восстановления сессии`, error);
          
          // Создаем временную сессию
          const temporaryId = Math.floor(Math.random() * 1000000) + 1;
          return {
            user: {
              id: temporaryId,
              username: `temp_${temporaryId}`,
              ref_code: `REF${temporaryId}`,
              telegram_id: telegramData ? 12345678 : null,
              telegram_username: telegramData ? 'temp_user' : null,
              guest_id: guestId || uuidv4(),
              created_at: new Date().toISOString(),
              referrer_id: null,
              is_fallback: true
            },
            session_id: `sess_${uuidv4()}`,
            is_new_user: false,
            message: 'Временная сессия создана из-за недоступности базы данных'
          };
        }
      );
      
      const sessionData = await restoreSessionWithFallback(guest_id, telegram_data);
      sendSuccess(res, sessionData);
    } catch (error) {
      next(error);
    }
  }
}