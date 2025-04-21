import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ReferralService } from '../services/referralService';
import { createHmac, createHash } from 'crypto';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Контроллер для аутентификации пользователей
 */
export class AuthController {
  // Telegram Bot API token должен быть установлен в переменных окружения
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  /**
   * Аутентификация пользователя через Telegram
   */
  static async authenticateTelegram(req: Request, res: Response): Promise<void> {
    try {
      const { authData, referrerId } = req.body;
      
      // АУДИТ: логируем все заголовки запроса для анализа
      console.log("[АУДИТ] Received headers:", req.headers);
      console.log("[АУДИТ] Request body:", { authData, referrerId });
      
      if (!authData) {
        return sendError(res, 'Отсутствуют данные аутентификации', 400);
      }

      // Если есть аутентификационные данные, но нет токена бота, предупреждаем в логе
      // В тестовом режиме можно продолжить без проверки подписи
      if (!AuthController.BOT_TOKEN) {
        console.warn('TELEGRAM_BOT_TOKEN не установлен. Пропускаем проверку подписи данных.');
      }

      // Парсим данные из строки query-параметров
      const authParams = new URLSearchParams(authData);
      
      // Извлекаем параметры
      const hashFromTelegram = authParams.get('hash');
      const authDate = authParams.get('auth_date');
      const userId = authParams.get('id') ? parseInt(authParams.get('id')!) : null;
      const firstName = authParams.get('first_name');
      const username = authParams.get('username');
      const languageCode = authParams.get('language_code');
      
      // Проверяем наличие обязательных полей
      if (!hashFromTelegram || !authDate || !userId) {
        return sendError(res, 'Некорректные данные аутентификации', 400);
      }

      // Формируем строку для проверки
      let dataCheckString = '';
      
      // Удаляем hash из параметров для проверки
      authParams.delete('hash');
      
      // Сортируем оставшиеся параметры
      const sortedParams: [string, string][] = [];
      authParams.forEach((value, key) => {
        sortedParams.push([key, value]);
      });
      
      sortedParams.sort(([a], [b]) => a.localeCompare(b));
      
      // Формируем строку параметров в виде key=value
      dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');

      // Проверка на наличие тестового режима в URL или в теле запроса
      const testModeParam = req.body.testMode === true || authParams.get('test_mode') === 'true';
      const isTestMode = process.env.NODE_ENV === 'development' && testModeParam;
      
      // Проверяем подпись только если токен бота задан и не включен тестовый режим
      if (AuthController.BOT_TOKEN && !isTestMode) {
        // Создаем токен подписи
        const secretKey = createHash('sha256')
          .update(AuthController.BOT_TOKEN)
          .digest();
        
        // Вычисляем хеш от dataCheckString
        const calculatedHash = createHmac('sha256', secretKey)
          .update(dataCheckString)
          .digest('hex');
        
        // Проверяем совпадение хешей
        if (calculatedHash !== hashFromTelegram) {
          return sendError(res, 'Недействительная подпись данных', 401);
        }
        
        // Проверяем актуальность данных (не старше 24 часов)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const authTimestamp = parseInt(authDate);
        
        if (currentTimestamp - authTimestamp > 86400) {
          return sendError(res, 'Данные аутентификации устарели', 401);
        }
      }
      
      // Если включен тестовый режим, выводим информацию в лог
      if (isTestMode) {
        console.log('[AUTH] Тестовый режим: пропускаем проверку подписи данных');
      }

      // Пытаемся найти пользователя по Telegram ID
      let user = await UserService.getUserByTelegramId(userId);
      let isNewUser = false;
      let referrerRegistered = false;
      
      // Если пользователь не найден, создаем нового
      if (!user) {
        isNewUser = true;
        user = await UserService.createUser({
          telegram_id: userId,
          username: username || `user_${userId}`,
          balance_uni: "1000", // Начальный бонус
          balance_ton: "0",
          created_at: new Date()
        });
        
        console.log(`Создан новый пользователь: ${user.id}, telegram_id: ${userId}`);
      } else {
        // Обновляем информацию о пользователе, если она изменилась
        if (username && username !== user.username) {
          user = await UserService.updateUser(user.id, { username });
        }
      }

      // Проверяем, что пользователь был успешно создан или найден
      if (!user) {
        return sendError(res, 'Не удалось создать или найти пользователя', 500);
      }

      // Обработка реферальной связи, если есть параметр referrerId и пользователь новый
      if (referrerId && isNewUser) {
        try {
          // Проверяем, существует ли пользователь с указанным referrerId
          let inviterId = parseInt(referrerId);
          if (!isNaN(inviterId)) {
            // Проверяем, существует ли пользователь-приглашающий
            const inviter = await UserService.getUserById(inviterId);
            
            if (inviter) {
              // Создаем реферальную связь (уровень 1)
              const referral = await ReferralService.createReferral({
                user_id: user.id,
                inviter_id: inviterId,
                level: 1,
                created_at: new Date()
              });
              
              if (referral) {
                console.log(`Создана реферальная связь: пользователь ${user.id} приглашен пользователем ${inviterId}`);
                referrerRegistered = true;
              }
            }
          }
        } catch (error) {
          console.error('Ошибка при создании реферальной связи:', error);
          // Продолжаем выполнение, так как ошибка реферальной системы не критична для аутентификации
        }
      }

      // Отправляем успешный ответ с данными пользователя
      sendSuccess(res, {
        user_id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        referrer_registered: referrerRegistered // Флаг успешной регистрации реферальной связи
      });
    } catch (error) {
      console.error('Ошибка аутентификации через Telegram:', error);
      sendServerError(res, error);
    }
  }
}