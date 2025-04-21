import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ReferralService } from '../services/referralService';
import { createHmac, createHash } from 'crypto';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateTelegramInitData, TelegramValidationResult, isForbiddenUserId, logTelegramData, logTelegramId } from '../utils/telegramUtils';

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
      
      // АУДИТ: подробное логирование для анализа проблемы
      console.log("[АУДИТ] Received headers:", JSON.stringify(req.headers, null, 2));
      console.log("[АУДИТ] Request body:", { 
        authData: authData ? `${authData.substring(0, 20)}...` : 'отсутствует',
        referrerId 
      });
      
      // Проверяем наличие данных аутентификации
      if (!authData) {
        console.error("[АУДИТ] ОШИБКА: Отсутствуют данные аутентификации в запросе");
        return sendError(res, 'Отсутствуют данные аутентификации', 400);
      }
      
      // Создаем переменную среды для режима разработки/тестирования
      const IS_DEV = process.env.NODE_ENV === 'development' || 
                    process.env.IS_DEV === 'true' || 
                    req.body.testMode === true;
                    
      // Информируем о режиме работы
      console.log("[АУДИТ] Режим работы:", IS_DEV ? 'development' : 'production');

      // Проверка на наличие токена бота
      if (!AuthController.BOT_TOKEN) {
        console.error('[АУДИТ] КРИТИЧЕСКАЯ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен');
        
        // Проверяем секрет в окружении
        console.log('[АУДИТ] Проверка переменных окружения:', {
          hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
          envKeys: Object.keys(process.env).filter(key => key.includes('TELEGRAM') || key.includes('BOT')),
          nodeEnv: process.env.NODE_ENV
        });
        
        // В тестовом/дев режиме продолжаем без токена
        if (process.env.NODE_ENV === 'development') {
          console.warn('[АУДИТ] Продолжаем без проверки подписи в режиме разработки');
        } else {
          // В продакшене требуем валидный токен
          return sendError(res, 'Ошибка конфигурации сервера. Пожалуйста, свяжитесь с поддержкой.', 500);
        }
      }

      // Парсим данные из строки query-параметров
      const authParams = new URLSearchParams(authData);
      
      // Извлекаем и логируем все параметры для диагностики
      const allParams: Record<string, string> = {};
      authParams.forEach((value, key) => {
        allParams[key] = key === 'hash' ? `${value.substring(0, 10)}...` : value;
      });
      console.log("[АУДИТ] Все параметры из initData:", allParams);
      
      // Извлекаем необходимые параметры
      const hashFromTelegram = authParams.get('hash');
      const authDate = authParams.get('auth_date');
      const userId = authParams.get('id') ? parseInt(authParams.get('id')!) : 
                    authParams.get('user') ? JSON.parse(authParams.get('user')!).id : null;
      const firstName = authParams.get('first_name') || 
                        (authParams.get('user') ? JSON.parse(authParams.get('user')!).first_name : null);
      const username = authParams.get('username') || 
                      (authParams.get('user') ? JSON.parse(authParams.get('user')!).username : null);
      
      // Поддержка разных форматов initData (обычный и мини-приложения)
      const userDataFormat = authParams.has('user') ? 'mini-app' : 'standard';
      
      console.log("[АУДИТ] Извлеченные ключевые параметры:", {
        dataFormat: userDataFormat,
        hashPresent: !!hashFromTelegram,
        authDatePresent: !!authDate,
        userIdPresent: !!userId,
        userId: userId,
        username: username || 'не указан',
        firstName: firstName || 'не указан'
      });
      
      // Проверяем наличие обязательных полей
      if (!hashFromTelegram) {
        console.error("[АУДИТ] ОШИБКА: Отсутствует hash в данных аутентификации");
        return sendError(res, 'Отсутствует хеш подписи в данных аутентификации', 400);
      }
      
      if (!authDate) {
        console.error("[АУДИТ] ОШИБКА: Отсутствует auth_date в данных аутентификации");
        return sendError(res, 'Отсутствует дата аутентификации', 400);
      }
      
      if (!userId) {
        console.error("[АУДИТ] ОШИБКА: Отсутствует id пользователя в данных аутентификации");
        return sendError(res, 'Отсутствует ID пользователя Telegram', 400);
      }

      // Формируем строку для проверки согласно спецификации Telegram WebApp
      let dataCheckString = '';
      
      // Удаляем hash из параметров для проверки
      const checkParams = new URLSearchParams(authData);
      checkParams.delete('hash');
      
      // Сортируем параметры по алфавиту (требование Telegram API)
      const sortedParams: [string, string][] = [];
      checkParams.forEach((value, key) => {
        sortedParams.push([key, value]);
      });
      
      sortedParams.sort(([a], [b]) => a.localeCompare(b));
      
      // Формируем строку проверки согласно документации Telegram
      // https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
      dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');
      
      console.log("[АУДИТ] Строка для проверки подписи (первые 50 символов):", 
                 dataCheckString.substring(0, 50) + '...');

      // Проверка на тестовый режим
      const testModeParam = req.body.testMode === true || authParams.get('test_mode') === 'true';
      const isTestMode = process.env.NODE_ENV === 'development' && testModeParam;
      
      // Проверяем подпись и валидность данных Telegram с новой утилитой
      const validationResult: TelegramValidationResult = validateTelegramInitData(
        authData,
        AuthController.BOT_TOKEN,
        {
          maxAgeSeconds: 86400, // 24 часа по умолчанию
          isDevelopment: isTestMode || process.env.NODE_ENV !== 'production',
          requireUserId: !isTestMode, // В тестовом режиме не требуем userId
          allowFallbackId: isTestMode // В продакшене запрещаем ID=1
        }
      );
      
      // Подробное логирование результатов проверки
      logTelegramData(authData, validationResult, 'AUTH');
      
      // Проверяем результаты валидации
      if (!validationResult.isValid) {
        console.error("[АУДИТ] ОШИБКА: Данные инициализации Telegram недействительны");
        console.error("[АУДИТ] Причины:", validationResult.validationErrors);
        
        // В тестовом режиме игнорируем ошибки валидации
        if (!isTestMode) {
          return sendError(res, 'Данные аутентификации Telegram недействительны', 401);
        } else {
          console.log("[АУДИТ] Тестовый режим: игнорируем ошибки валидации");
        }
      }
      
      // Дополнительная проверка на запрещенные ID (например, ID=1 в продакшене)
      if (isForbiddenUserId(validationResult.userId) && !isTestMode) {
        console.error("[АУДИТ] КРИТИЧЕСКАЯ ОШИБКА: Использование запрещенного userId:", validationResult.userId);
        return sendError(res, 'Недопустимый ID пользователя', 400);
      }
      
      // Используем userId из валидационного результата, если он доступен
      let telegramUserId = validationResult.userId || userId;
      
      // Логируем успешную валидацию
      console.log("[АУДИТ] Данные Telegram успешно проверены:", {
        userId,
        username: validationResult.username || username,
        startParam: validationResult.startParam
      });
      
      // Если включен тестовый режим, выводим информацию в лог
      if (isTestMode) {
        console.log('[AUTH] Тестовый режим: пропускаем проверку подписи данных');
      }

      // Пытаемся найти пользователя по Telegram ID
      let user = await UserService.getUserByTelegramId(telegramUserId);
      let isNewUser = false;
      let referrerRegistered = false;
      
      // Логируем результат поиска пользователя
      console.log(`[AUTH] Поиск пользователя по Telegram ID: ${telegramUserId}, результат: ${user ? 'найден' : 'не найден'}`);
      
      // Если пользователь не найден, создаем нового
      if (!user) {
        isNewUser = true;
        user = await UserService.createUser({
          telegram_id: telegramUserId,
          username: username || `user_${telegramUserId}`,
          balance_uni: "1000", // Начальный бонус
          balance_ton: "0",
          created_at: new Date()
        });
        
        console.log(`[AUTH] Создан новый пользователь: ${user.id}, telegram_id: ${telegramUserId}`);
        // Используем нашу новую функцию логирования для диагностики
        logTelegramId(user, 'AuthController:NewUser');
      } else {
        // Обновляем информацию о пользователе, если она изменилась
        if (username && username !== user.username) {
          user = await UserService.updateUser(user.id, { username });
        }
        
        // Логируем существующего пользователя для диагностики
        logTelegramId(user, 'AuthController:ExistingUser');
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

      // Логируем успешную аутентификацию
      console.log("[АУДИТ] Успешная аутентификация через Telegram:", {
        userId: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        isNewUser: isNewUser,
        referrerRegistered: referrerRegistered,
        validationSuccess: validationResult.isValid
      });
      
      // Отправляем успешный ответ с данными пользователя
      sendSuccess(res, {
        user_id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        referrer_registered: referrerRegistered, // Флаг успешной регистрации реферальной связи
        auth_source: 'telegram',
        auth_status: 'verified'
      });
    } catch (error) {
      console.error('[АУДИТ] Ошибка аутентификации через Telegram:', error);
      
      // Добавим подробную диагностику ошибки
      let errorMessage = 'Внутренняя ошибка сервера';
      let errorDetails = {};
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          stack: error.stack?.substring(0, 200) // Первые 200 символов стека вызовов
        };
      }
      
      console.error('[АУДИТ] Детали ошибки:', {
        message: errorMessage,
        details: errorDetails,
        requestBody: {
          hasAuthData: !!req.body.authData,
          authDataLength: req.body.authData ? req.body.authData.length : 0,
          referrerId: req.body.referrerId
        }
      });
      
      sendServerError(res, error);
    }
  }
}