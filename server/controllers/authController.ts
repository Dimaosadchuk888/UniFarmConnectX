import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authService } from '../services/index';
import { sendSuccess, sendError } from '../utils/responseUtils';

/**
 * AuthController с обязательной Telegram верификацией
 * Все пользователи должны быть зарегистрированы через Telegram
 */
export class AuthController {
  /**
   * Аутентификация и регистрация пользователя через Telegram
   * Единственный способ входа в систему
   */
  static async authenticateTelegram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Создаем схему валидации данных Telegram
      const telegramAuthSchema = z.object({
        telegram_id: z.number(),
        username: z.string().optional(),
        first_name: z.string(),
        last_name: z.string().optional(),
        initData: z.string(),
        parent_ref_code: z.string().optional(),
        start_param: z.string().optional()
      });

      // Валидируем данные запроса
      const validatedData = telegramAuthSchema.safeParse(req.body);

      if (!validatedData.success) {
        return sendError(res, 'Неверный формат данных Telegram', 400, validatedData.error);
      }

      const { telegram_id, username, first_name, last_name, initData, parent_ref_code, start_param } = validatedData.data;

      // Проверяем валидность initData
      if (!initData || initData.length === 0) {
        return sendError(res, 'Отсутствует initData - доступ только через Telegram Mini App', 403);
      }

      // Валидируем initData (в продакшене)
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (!isDevelopment) {
        try {
          await authService.validateTelegramInitData(initData);
        } catch (validationError) {
          return sendError(res, 'Недействительные данные Telegram', 403, validationError);
        }
      }

      // Попытка аутентификации существующего пользователя
      const user = await authService.authenticateTelegramUser({
        telegram_id,
        username,
        first_name,
        last_name,
        parent_ref_code: parent_ref_code || start_param
      });

      // Подготавливаем ответ
      const userResponse = {
        id: user.id,
        username: user.username,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet: user.wallet,
        ton_wallet_address: user.ton_wallet_address,
        ref_code: user.ref_code,
        parent_ref_code: user.parent_ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        created_at: user.created_at
      };

      // Возвращаем успешный ответ
      sendSuccess(res, {
        user: userResponse,
        authenticated: true,
        session_id: crypto.randomUUID()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Получение информации о текущем пользователе
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Извлекаем telegram_id из заголовков
      const telegramUserId = req.headers['x-telegram-user-id'];

      console.log('[AuthController] getCurrentUser - telegram_id из заголовков:', telegramUserId);

      if (!telegramUserId) {
        console.error('[AuthController] getCurrentUser - отсутствует x-telegram-user-id в заголовках');
        return sendError(res, 'Отсутствует идентификатор пользователя Telegram', 401);
      }

      const telegramId = Number(telegramUserId);
      if (isNaN(telegramId)) {
        console.error('[AuthController] getCurrentUser - некорректный telegram_id:', telegramUserId);
        return sendError(res, 'Некорректный идентификатор пользователя Telegram', 400);
      }

      console.log('[AuthController] getCurrentUser - ищем пользователя с telegram_id:', telegramId);

      const user = await authService.getUserByTelegramId(telegramId);

      if (!user) {
        console.error('[AuthController] getCurrentUser - пользователь не найден для telegram_id:', telegramId);
        return sendError(res, 'Пользователь не найден', 404);
      }

      console.log('[AuthController] getCurrentUser - пользователь найден:', user.id);

      const userResponse = {
        id: user.id,
        username: user.username,
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet: user.wallet,
        ton_wallet_address: user.ton_wallet_address,
        ref_code: user.ref_code,
        parent_ref_code: user.parent_ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        created_at: user.created_at
      };

      sendSuccess(res, { user: userResponse });
    } catch (error) {
      console.error('[AuthController] getCurrentUser - ошибка:', error);
      next(error);
    }
  }
}