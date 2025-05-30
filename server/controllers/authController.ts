import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authService } from '../services/index';
import { sendSuccess, sendError } from '../utils/responseUtils';

/**
 * AuthController с поддержкой Telegram и guest_id
 * Поддерживает регистрацию через Telegram и guest_id fallback
 */
export class AuthController {
  /**
   * Аутентификация и регистрация пользователя через Telegram или guest_id
   * Поддерживает fallback к guest_id при отсутствии Telegram данных
   */
  static async authenticateTelegram(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('[AuthController] Новый запрос аутентификации Telegram');
      console.log('[AuthController] Данные запроса:', {
        body: req.body,
        headers: {
          'x-telegram-init-data': req.headers['x-telegram-init-data'] ? 'присутствует' : 'отсутствует',
          'x-telegram-user-id': req.headers['x-telegram-user-id'] || 'отсутствует'
        }
      });

      // Создаем схему валидации данных Telegram или guest_id
      const telegramAuthSchema = z.object({
        telegram_id: z.number().optional(),
        username: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        initData: z.string().optional(),
        guest_id: z.string().optional(),
        parent_ref_code: z.string().optional(),
        start_param: z.string().optional()
      });

      // Валидируем данные запроса
      const validatedData = telegramAuthSchema.safeParse(req.body);

      if (!validatedData.success) {
        console.error('[AuthController] Ошибка валидации данных:', validatedData.error);
        return sendError(res, 'Неверный формат данных Telegram', 400, validatedData.error);
      }

      const { telegram_id, username, first_name, last_name, initData, guest_id, parent_ref_code, start_param } = validatedData.data;

      // Проверяем наличие telegram_id или guest_id
      if (!telegram_id && !guest_id) {
        return sendError(res, 'Требуется telegram_id или guest_id для аутентификации', 400);
      }

      // Если есть guest_id но нет telegram_id, используем guest_id режим
      if (!telegram_id && guest_id) {
        console.log('[AuthController] Fallback к guest_id аутентификации:', guest_id);
        
        const guestUser = await authService.authenticateGuestUser({
          guest_id,
          username: username || 'Guest User',
          first_name: first_name || 'Guest',
          last_name: last_name || '',
          parent_ref_code: parent_ref_code || start_param
        });

        const userResponse = {
          id: guestUser.id,
          username: guestUser.username,
          telegram_id: guestUser.telegram_id,
          guest_id: guestUser.guest_id,
          first_name: guestUser.first_name,
          last_name: guestUser.last_name,
          wallet: guestUser.wallet,
          ton_wallet_address: guestUser.ton_wallet_address,
          ref_code: guestUser.ref_code,
          parent_ref_code: guestUser.parent_ref_code,
          balance_uni: guestUser.balance_uni,
          balance_ton: guestUser.balance_ton,
          created_at: guestUser.created_at
        };

        return sendSuccess(res, {
          user: userResponse,
          authenticated: true,
          session_id: crypto.randomUUID(),
          auth_method: 'guest_id'
        });
      }

      // Проверяем валидность initData для Telegram
      if (telegram_id && (!initData || initData.length === 0)) {
        return sendError(res, 'Отсутствует initData для Telegram аутентификации', 403);
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