import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { sendSuccess } from '../utils/responseUtils';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * Обновленный AuthController следующий принципам SOLID
 * Ответственность ограничена обработкой HTTP-запросов,
 * вся бизнес-логика вынесена в AuthService
 */
export class AuthController {
  /**
   * Аутентификация пользователя через Telegram
   */
  static async authenticateTelegram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // АУДИТ: Логирование для анализа проблемы
      console.log("[АУДИТ] Получен запрос на аутентификацию через Telegram");
      
      // Извлекаем Telegram Init Data из заголовков
      const telegramInitData = req.headers['telegram-init-data'] || 
                              req.headers['x-telegram-init-data'] || 
                              req.headers['telegram-data'] ||
                              req.headers['x-telegram-data'];
      
      // Извлекаем все поля из req.body
      const { 
        authData: bodyAuthData, 
        userId: bodyUserId, 
        username: bodyUsername, 
        firstName: bodyFirstName, 
        lastName: bodyLastName, 
        startParam: bodyStartParam, 
        referrerId, 
        refCode: bodyRefCode,
        guest_id: bodyGuestId,
        testMode
      } = req.body;
      
      // Используем данные из заголовка, если они есть, иначе из тела запроса
      const authData = typeof telegramInitData === 'string' ? telegramInitData : bodyAuthData;
      
      // Создаем объект данных для сервиса
      const telegramAuthData = {
        authData,
        userId: bodyUserId,
        username: bodyUsername,
        firstName: bodyFirstName,
        lastName: bodyLastName,
        startParam: bodyStartParam,
        referrerId,
        refCode: bodyRefCode,
        guest_id: bodyGuestId,
        testMode
      };
      
      // Определяем режим работы
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.IS_DEV === 'true' || 
                          req.body.testMode === true;
      
      // Делегируем обработку сервису
      const user = await AuthService.authenticateTelegram(telegramAuthData, isDevelopment);
      
      // Формируем ответ
      sendSuccess(res, {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          ref_code: user.ref_code,
          telegram_id: user.telegram_id,
          parent_ref_code: user.parent_ref_code
        },
        authenticated: true
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Регистрация гостевого пользователя для работы в режиме AirDrop
   */
  static async registerGuestUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod
      const guestRegistrationSchema = z.object({
        guest_id: z.string().min(1, "Идентификатор гостя обязателен"),
        username: z.string().optional(),
        parent_ref_code: z.string().optional(),
        ref_code: z.string().optional(),
        airdrop_mode: z.boolean().optional(),
        telegram_id: z.number().optional()
      });
      
      // Проверяем входные данные
      const validatedData = guestRegistrationSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const errorMessage = validatedData.error.errors.map(e => e.message).join(", ");
        throw new Error(errorMessage);
      }
      
      // Делегируем обработку сервису
      const user = await AuthService.registerGuestUser(validatedData.data);
      
      // Формируем ответ
      sendSuccess(res, {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          ref_code: user.ref_code,
          guest_id: user.guest_id,
          parent_ref_code: user.parent_ref_code
        },
        registered: true
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Регистрация обычного пользователя
   */
  static async registerUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Валидация входных данных с помощью Zod
      const userRegistrationSchema = z.object({
        username: z.string().min(1, "Имя пользователя обязательно"),
        refCode: z.string().optional(),
        parentRefCode: z.string().optional(),
        startParam: z.string().optional(),
        telegram_id: z.number().optional(),
        guest_id: z.string().optional()
      });
      
      // Проверяем входные данные
      const validatedData = userRegistrationSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const errorMessage = validatedData.error.errors.map(e => e.message).join(", ");
        throw new Error(errorMessage);
      }
      
      // Делегируем обработку сервису
      const user = await AuthService.registerUser(validatedData.data);
      
      // Формируем ответ
      sendSuccess(res, {
        user: {
          id: user.id,
          username: user.username,
          balance: user.balance,
          ref_code: user.ref_code,
          parent_ref_code: user.parent_ref_code
        },
        registered: true
      });
    } catch (error) {
      next(error);
    }
  }
}