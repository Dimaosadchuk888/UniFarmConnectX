import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ReferralService } from '../services/referralService';
import { ReferralBonusService } from '../services/referralBonusService';
import { createHmac, createHash } from 'crypto';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateTelegramInitData, TelegramValidationResult, isForbiddenUserId } from '../utils/telegramUtils';
import { storage } from '../storage';

/**
 * Контроллер для аутентификации пользователей
 */
export class AuthController {
  // Telegram Bot API token должен быть установлен в переменных окружения
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
  
  /**
   * Регистрация пользователя только по guest_id (Режим полной независимости от Telegram)
   * Создает пользователя без требования Telegram данных
   * Поддерживает работу с разных Telegram-аккаунтов на одном устройстве
   */
  static async registerGuestUser(req: Request, res: Response): Promise<void> {
    try {
      // Извлекаем данные из тела запроса
      const {
        guest_id,
        username,
        parent_ref_code,
        ref_code, // Параметр для обработки реферальных ссылок
        airdrop_mode, // Получаем флаг режима AirDrop
        telegram_id // Параметр для опциональной привязки к Telegram ID
      } = req.body;
      
      console.log(`[AirDrop] Запрос на создание гостевого пользователя:`, {
        guest_id: guest_id || 'не указан',
        username: username || 'не указан', 
        parent_ref_code: parent_ref_code || 'не указан',
        ref_code: ref_code || 'не указан',
        airdrop_mode: airdrop_mode ? 'true' : 'false',
        has_telegram_id: telegram_id ? 'yes' : 'no'
      });
      
      // Проверяем наличие guest_id
      if (!guest_id) {
        console.error('[AirDrop] Отсутствует обязательный параметр guest_id');
        return sendError(res, 'Отсутствует идентификатор гостя', 400);
      }
      
      // Проверяем, существует ли пользователь с таким guest_id
      let user = await storage.getUserByGuestId(guest_id);
      let isNewUser = false;
      
      if (user) {
        // Пользователь уже существует, просто возвращаем информацию
        console.log(`[AirDrop] Пользователь уже существует по guest_id=${guest_id}, user_id=${user.id}`);
        
        // Если у пользователя нет реферального кода, генерируем его
        if (!user.ref_code) {
          console.log(`[AirDrop] У существующего пользователя (ID=${user.id}) отсутствует ref_code. Генерируем...`);
          try {
            // Генерируем и устанавливаем новый реферальный код
            const newRefCode = storage.generateRefCode();
            
            // Обновляем пользователя
            const [updatedUser] = await db
              .update(users)
              .set({ ref_code: newRefCode })
              .where(eq(users.id, user.id))
              .returning();
            
            if (updatedUser) {
              console.log(`[AirDrop] Успешно обновлен ref_code для пользователя ID=${user.id}: ${newRefCode}`);
              user = updatedUser;
            }
          } catch (updateError) {
            console.error(`[AirDrop] Ошибка при обновлении ref_code:`, updateError);
          }
        }
      } else {
        // Создаем нового пользователя
        isNewUser = true;
        
        // Обрабатываем реферальный код из параметра ref_code
        let refCodeFromParam = null;
        if (ref_code && ref_code.length > 0) {
          console.log(`[AirDrop] Получен параметр ref_code: ${ref_code}`);
          refCodeFromParam = ref_code;
        }
        
        // Определяем родительский реферальный код
        const effectiveParentRefCode = parent_ref_code || refCodeFromParam || null;
        
        if (effectiveParentRefCode) {
          console.log(`[AirDrop] Установлен родительский реферальный код: ${effectiveParentRefCode}`);
        }
        
        try {
          // Создаем пользователя через метод createGuestUser
          user = await storage.createGuestUser({
            guest_id: guest_id,
            telegram_id: telegram_id, // Опционально сохраняем telegram_id, если он был передан
            username: username || `airdrop_${Math.floor(Math.random() * 10000)}`,
            balance_uni: "100", // Начальный бонус
            balance_ton: "0", 
            parent_ref_code: effectiveParentRefCode,
            created_at: new Date()
          });
          
          console.log(`[AirDrop] Пользователь успешно создан:`, {
            id: user?.id,
            guest_id: user?.guest_id,
            ref_code: user?.ref_code,
            parent_ref_code: user?.parent_ref_code,
            telegram_id: user?.telegram_id || 'не задан'
          });
        } catch (err) {
          const createError = err as Error;
          console.error(`[AirDrop] Ошибка при создании пользователя:`, createError);
          return sendServerError(res, `Ошибка при создании пользователя: ${createError.message || 'Неизвестная ошибка'}`);
        }
      }
      
      // Проверяем, что пользователь был успешно создан или найден
      if (!user) {
        return sendError(res, 'Не удалось создать или найти пользователя', 500);
      }
      
      // Формируем ответ с данными пользователя
      const responseData = {
        user_id: user.id,
        username: user.username,
        ref_code: user.ref_code,
        guest_id: user.guest_id,
        parent_ref_code: user.parent_ref_code,
        balance_uni: user.balance_uni,
        created_at: user.created_at,
        is_new_user: isNewUser
      };
      
      // Отправляем успешный ответ
      sendSuccess(res, responseData);
    } catch (err) {
      const error = err as Error;
      console.error('[AirDrop] Ошибка при обработке запроса:', error);
      sendServerError(res, error.message || 'Неизвестная ошибка');
    }
  }
  
  /**
   * Регистрация нового пользователя по данным из Telegram WebApp initData (ТЗ 2.1)
   */
  static async registerUser(req: Request, res: Response): Promise<void> {
    try {
      // Извлекаем данные из тела запроса
      const {
        telegram_user_id,
        guest_id, // Добавляем поддержку guest_id
        username,
        first_name, 
        last_name,
        photo_url,
        startParam,
        ref_code,
        parent_ref_code // Добавляем поддержку реферальных кодов для 2.2
      } = req.body;
      
      // Проверяем, что передан ID пользователя Telegram (AirDrop Upgrade)
      // В режиме AirDrop мы разрешаем регистрацию без Telegram ID
      const isAirdropMode = req.body.airdrop_mode === true || 
                           process.env.ALLOW_AIRDROP_MODE === 'true' ||
                           process.env.NODE_ENV === 'development';
      
      // Создаем переменную для ID с возможностью изменения
      let user_telegram_id = telegram_user_id;
      
      if (!user_telegram_id && !isAirdropMode) {
        console.error('[REGISTER] Отсутствует обязательный параметр telegram_user_id и не включен режим AirDrop');
        return sendError(res, 'Отсутствует ID пользователя Telegram', 400);
      }
      
      // Если режим AirDrop включен и ID не передан, генерируем временный ID
      if (!user_telegram_id && isAirdropMode) {
        // Генерируем уникальный временный ID на основе timestamp
        user_telegram_id = Math.floor(Date.now() / 1000);
        console.log(`[REGISTER] AirDrop Mode: Сгенерирован временный ID: ${user_telegram_id}`);
      }
      
      // Логируем получение запроса на регистрацию
      console.log(`[REGISTER] Запрос на регистрацию пользователя: ID=${user_telegram_id}, username=${username || 'не указан'}`);
      console.log(`[REGISTER] Дополнительные данные:`, { 
        first_name: first_name || 'не указан', 
        last_name: last_name || 'не указан',
        startParam: startParam || 'не указан',
        ref_code: ref_code || 'не указан',
        parent_ref_code: parent_ref_code || 'не указан'
      });
      
      // Проверяем, существует ли уже пользователь с таким Telegram ID
      let user = await storage.getUserByTelegramId(user_telegram_id);
      let isNewUser = false;
      
      if (user) {
        // Пользователь уже существует, просто возвращаем информацию
        console.log(`[REGISTER] Пользователь уже существует: telegram_id=${user_telegram_id}, user_id=${user.id}`);
      } else {
        // Создаем нового пользователя
        isNewUser = true;
        
        // Генерируем уникальный реферальный код
        const newRefCode = storage.generateRefCode();
        
        // Создаем пользователя
        try {
          console.log(`[REGISTER] Создаю пользователя с данными:`, {
            telegram_id: user_telegram_id,
            username: username || `user_${user_telegram_id}`,
            ref_code: newRefCode,
            parent_ref_code: parent_ref_code || 'не указан', // Добавляем родительский реферальный код для логирования
            mode: isAirdropMode ? 'AirDrop' : 'Standard'
          });
        
          // Используем метод storage.createMainUser для создания в основной таблице пользователей
          if (guest_id) {
            console.log(`[REGISTER] Получен guest_id: ${guest_id}`);
          }
          
          // Проверяем, существует ли пользователь с таким guest_id (если он был передан)
          let existingUserByGuestId = null;
          if (guest_id) {
            existingUserByGuestId = await storage.getUserByGuestId(guest_id);
            if (existingUserByGuestId) {
              console.log(`[REGISTER] Найден существующий пользователь по guest_id: ${guest_id}, user_id=${existingUserByGuestId.id}`);
              // Если у пользователя нет telegram_id, но он передан в запросе, обновляем запись
              if (!existingUserByGuestId.telegram_id && user_telegram_id) {
                // Обновляем telegram_id для существующего пользователя
                const [updatedUser] = await db
                  .update(users)
                  .set({ telegram_id: user_telegram_id })
                  .where(eq(users.id, existingUserByGuestId.id))
                  .returning();
                
                console.log(`[REGISTER] Обновлен telegram_id для пользователя с guest_id ${guest_id}: ${user_telegram_id}`);
                user = updatedUser;
                isNewUser = false;
                return;
              } else {
                // Просто используем существующего пользователя
                user = existingUserByGuestId;
                isNewUser = false;
                return;
              }
            }
          }
          
          // Создаем нового пользователя с поддержкой guest_id и parent_ref_code
          user = await storage.createMainUser({
            telegram_id: user_telegram_id,
            guest_id: guest_id, // Используем переданный guest_id или он будет сгенерирован автоматически
            username: username || `user_${user_telegram_id}`,
            balance_uni: "100", // Начальный бонус
            balance_ton: "0",
            ref_code: newRefCode,
            parent_ref_code: parent_ref_code, // Добавляем родительский реферальный код
            created_at: new Date()
          });
          
          console.log(`[REGISTER] Пользователь успешно создан:`, {
            id: user?.id,
            telegram_id: user?.telegram_id,
            ref_code: user?.ref_code
          });
        } catch (createError) {
          console.error(`[REGISTER] Ошибка при создании пользователя:`, createError);
          throw createError;
        }
        
        console.log(`[REGISTER] Новый пользователь создан: id=${user.id}, telegram_id=${user_telegram_id}, ref_code=${newRefCode}`);
      }
      
      // Проверяем, что пользователь был успешно создан или найден
      if (!user) {
        return sendError(res, 'Не удалось создать или найти пользователя', 500);
      }
      
      // Обработка реферальной привязки (только для новых пользователей)
      let referrerRegistered = false;
      
      if (isNewUser && (ref_code || startParam)) {
        // Определяем ref_code для поиска реферера
        let refCodeToUse = ref_code || '';
        
        // Если передан startParam в формате ref_XXX, извлекаем код
        if (!refCodeToUse && startParam && startParam.startsWith('ref_')) {
          refCodeToUse = startParam.substring(4);
          console.log(`[REGISTER] [ReferralSystem] Извлечен ref_code из startParam: ${refCodeToUse}`);
        }
        
        if (refCodeToUse) {
          try {
            // Ищем пользователя с таким ref_code
            const inviter = await storage.getUserByRefCode(refCodeToUse);
            
            if (inviter && inviter.id !== user.id) {
              // Проверяем, нет ли уже реферальной связи
              const existingReferral = await ReferralService.getUserInviter(user.id);
              
              if (!existingReferral) {
                // Создаем реферальную связь (уровень 1)
                const referral = await ReferralService.createReferralRelationship(user.id, inviter.id);
                
                if (referral) {
                  console.log(`[REGISTER] [ReferralSystem] Создана реферальная связь: пользователь ${user.id} приглашен пользователем ${inviter.id}`);
                  referrerRegistered = true;
                  
                  // Создаем многоуровневую реферальную цепочку
                  const chainResult = await ReferralBonusService.createReferralChain(user.id, inviter.id);
                  console.log(`[REGISTER] [ReferralSystem] Создание реферальной цепочки: ${chainResult.success ? 'успешно' : 'ошибка'}, ${chainResult.message}`);
                }
              } else {
                console.log(`[REGISTER] [ReferralSystem] Пользователь ${user.id} уже имеет пригласителя: ${existingReferral.inviter_id}`);
              }
            } else if (inviter && inviter.id === user.id) {
              console.log(`[REGISTER] [ReferralSystem] Отклонена попытка самореферальности: ${user.id}`);
            } else {
              console.log(`[REGISTER] [ReferralSystem] Пригласитель с ref_code=${refCodeToUse} не найден`);
            }
          } catch (error) {
            console.error('[REGISTER] [ReferralSystem] Ошибка при создании реферальной связи:', error);
          }
        }
      }
      
      // Отправляем успешный ответ с данными пользователя, включая guest_id
      sendSuccess(res, {
        id: user.id,
        telegram_id: user.telegram_id,
        guest_id: user.guest_id, // Добавляем guest_id в ответ
        username: user.username,
        ref_code: user.ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        is_new_user: isNewUser,
        referrer_registered: referrerRegistered
      });
    } catch (error) {
      // Структурированное логирование ошибки
      console.error('[AuthController] [Ошибка регистрации пользователя]', {
        method: 'registerGuestUser',
        guestId: req.body?.guest_id,
        username: req.body?.username,
        hasParentRefCode: !!req.body?.parent_ref_code,
        hasRefCode: !!req.body?.ref_code,
        airdropMode: !!req.body?.airdrop_mode,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: new Date().toISOString()
      });
      
      // В режиме разработки выводим полный стек ошибки
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthController] [Стек ошибки]:', error);
      }
      
      sendServerError(res, error);
    }
  }


  /**
   * Аутентификация пользователя через Telegram
   */
  static async authenticateTelegram(req: Request, res: Response): Promise<void> {
    try {
      // Проверяем заголовки на наличие Telegram-Init-Data (согласно п.1.2 ТЗ)
      const telegramInitData = req.headers['telegram-init-data'] || 
                              req.headers['x-telegram-init-data'] || 
                              req.headers['telegram-data'] ||
                              req.headers['x-telegram-data'];
      
      // Извлекаем все поля из req.body для более гибкой обработки
      const { 
        authData: bodyAuthData, 
        userId: bodyUserId, 
        username: bodyUsername, 
        firstName: bodyFirstName, 
        lastName: bodyLastName, 
        startParam: bodyStartParam, 
        referrerId, 
        refCode: bodyRefCode,
        guest_id: bodyGuestId // Добавляем поддержку guest_id
      } = req.body;
      
      // Используем данные из заголовка, если они есть, иначе из тела запроса
      const authData = typeof telegramInitData === 'string' ? telegramInitData : bodyAuthData;
      
      // АУДИТ: подробное логирование для анализа проблемы
      console.log("[АУДИТ] Received headers:", JSON.stringify(req.headers, null, 2));
      console.log("[АУДИТ] Request body полный:", req.body);
      console.log("[АУДИТ] Request body детали:", { 
        headerInitData: telegramInitData ? `${typeof telegramInitData === 'string' ? telegramInitData.substring(0, 20) : 'не строка'}...` : 'отсутствует',
        bodyAuthData: bodyAuthData ? `${typeof bodyAuthData === 'string' ? bodyAuthData.substring(0, 20) : JSON.stringify(bodyAuthData).substring(0, 20)}...` : 'отсутствует',
        userId: bodyUserId || 'не передан',
        username: bodyUsername || 'не передан',
        firstName: bodyFirstName || 'не передан',
        startParam: bodyStartParam || 'не передан',
        referrerId: referrerId || 'не передан',
        refCode: bodyRefCode || 'не передан',
        guest_id: bodyGuestId || 'не передан' // Добавляем информацию о guest_id
      });
      
      // Проверяем наличие данных аутентификации
      if (!authData) {
        console.error("[АУДИТ] ОШИБКА: Отсутствуют данные аутентификации в запросе (ни в заголовках, ни в теле)");
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
      
      // Корректно обрабатываем параметр user (который может быть JSON)
      let userObj = null;
      if (authParams.has('user')) {
        try {
          const userJson = authParams.get('user');
          if (userJson) {
            userObj = JSON.parse(userJson);
          }
        } catch (e) {
          console.error("[АУДИТ] Ошибка при разборе JSON в параметре user:", e);
        }
      }
      
      const parsedUserId = authParams.get('id') ? parseInt(authParams.get('id')!) : 
                    userObj ? userObj.id : null;
      const parsedFirstName = authParams.get('first_name') || 
                        (userObj ? userObj.first_name : null);
      const parsedUsername = authParams.get('username') || 
                      (userObj ? userObj.username : null);
      
      // Поддержка разных форматов initData (обычный и мини-приложения)
      const userDataFormat = authParams.has('user') ? 'mini-app' : 'standard';
      
      console.log("[АУДИТ] Извлеченные ключевые параметры:", {
        dataFormat: userDataFormat,
        hashPresent: !!hashFromTelegram,
        authDatePresent: !!authDate,
        userIdPresent: !!parsedUserId,
        userId: parsedUserId,
        username: parsedUsername || 'не указан',
        firstName: parsedFirstName || 'не указан'
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
      
      if (!parsedUserId && !bodyUserId) {
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
      
      // Подробное логирование результатов проверки отключено
      
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
      let telegramUserId = validationResult.userId || parsedUserId || bodyUserId;
      
      // Логируем успешную валидацию
      console.log("[АУДИТ] Данные Telegram успешно проверены:", {
        userId: telegramUserId,
        username: validationResult.username || parsedUsername || bodyUsername,
        startParam: validationResult.startParam || bodyStartParam
      });
      
      // Если включен тестовый режим, выводим информацию в лог
      if (isTestMode) {
        console.log('[AUTH] Тестовый режим: пропускаем проверку подписи данных');
      }

      // Проверяем, есть ли guest_id в запросе
      if (bodyGuestId) {
        console.log(`[AUTH] Получен guest_id: ${bodyGuestId}`);
      }

      // Пытаемся найти пользователя по Telegram ID или guest_id
      let user = null;
      let isNewUser = false;
      let referrerRegistered = false;
      
      // Сначала ищем по Telegram ID, если он есть
      if (telegramUserId) {
        user = await storage.getUserByTelegramId(telegramUserId);
      }
      
      // Если не нашли пользователя по Telegram ID, ищем по guest_id (если он предоставлен)
      if (!user && bodyGuestId) {
        user = await storage.getUserByGuestId(bodyGuestId);
        
        // Если нашли пользователя по guest_id, но у него нет Telegram ID и он предоставлен в запросе,
        // обновляем пользователя, чтобы добавить Telegram ID
        if (user && !user.telegram_id && telegramUserId) {
          const [updatedUser] = await db
            .update(users)
            .set({ telegram_id: telegramUserId })
            .where(eq(users.id, user.id))
            .returning();
          
          if (updatedUser) {
            console.log(`[AUTH] Обновлен Telegram ID для пользователя с guest_id ${bodyGuestId}: ${telegramUserId}`);
            user = updatedUser;
          }
        }
      }
      
      // Если пользователь не найден ни по Telegram ID, ни по guest_id, создаем нового
      if (!user) {
        isNewUser = true;
        
        // Генерируем уникальный реферальный код
        const refCode = storage.generateRefCode();
        
        // Создаем пользователя с поддержкой guest_id
        user = await storage.createMainUser({
          telegram_id: telegramUserId,
          guest_id: bodyGuestId, // Используем переданный guest_id если есть
          username: parsedUsername || bodyUsername || `user_${telegramUserId || 'guest'}`,
          balance_uni: "1000", // Начальный бонус
          balance_ton: "0",
          ref_code: refCode,
          created_at: new Date()
        });
        
        console.log(`Создан новый пользователь: ${user.id}, telegram_id: ${telegramUserId}, ref_code: ${refCode}`);
      } else {
        // Обновляем информацию о пользователе, если она изменилась
        const effectiveUsername = parsedUsername || bodyUsername;
        if (effectiveUsername && effectiveUsername !== user.username) {
          // Обновляем имя пользователя, если оно изменилось
          const [updatedUser] = await db
            .update(users)
            .set({ username: effectiveUsername })
            .where(eq(users.id, user.id))
            .returning();
          
          if (updatedUser) {
            user = updatedUser;
          }
        }
        
        // Проверяем, есть ли у пользователя ref_code, если нет - генерируем
        if (user && !user.ref_code) {
          const refCode = storage.generateRefCode();
          await storage.updateUserRefCode(user.id, refCode);
          console.log(`Обновлен реферальный код для пользователя ${user.id}: ${refCode}`);
          
          // Обновляем объект пользователя
          const updatedUser = await storage.getUserById(user.id);
          if (updatedUser) {
            user = updatedUser;
          }
        }
      }

      // Проверяем, что пользователь был успешно создан или найден
      if (!user) {
        return sendError(res, 'Не удалось создать или найти пользователя', 500);
      }

      // Обработка реферальной связи с поддержкой многоуровневой структуры
      // Приоритет:
      // 1. Наличие bodyRefCode из объекта запроса (обработанный формат)
      // 2. Проверка startParam из Telegram (исходный формат)
      const startParam = validationResult.startParam || '';
      
      console.log(`[AUTH] [ReferralSystem] Проверка параметров: startParam="${startParam}", refCode="${bodyRefCode || 'нет'}"`);
      
      // Улучшенная проверка формата для разных вариантов реферальных ссылок
      let refCode = '';
      
      // Сначала проверяем, есть ли уже готовый refCode из тела запроса (наш предпочтительный метод)
      if (bodyRefCode) {
        // Если формат уже ref_XXX, используем как есть
        if (bodyRefCode.startsWith('ref_')) {
          refCode = bodyRefCode.substring(4); // Отрезаем префикс ref_
          console.log(`[AUTH] [ReferralSystem] Обнаружен готовый реферальный код: ${refCode}`);
        } else {
          // Если формат произвольный, используем как есть
          refCode = bodyRefCode;
          console.log(`[AUTH] [ReferralSystem] Обнаружен нестандартный реферальный код: ${refCode}`);
        }
      }
      
      // Проверяем формат startParam=ref_{ref_code} только если еще не получили код из bodyRefCode
      if (!refCode && startParam.startsWith('ref_')) {
        refCode = startParam.substring(4);
        console.log(`[AUTH] [ReferralSystem] Обнаружен реферальный код из startParam: ${refCode}`);
      }
      // Поддержка устаревшего формата user{id} удалена в рамках Этапа 10 (финальная зачистка)
      
      // Если в startParam нет ref_code, проверяем referrerId
      let inviterId = 0;
      if (!refCode && referrerId) {
        // Проверяем, может быть это числовой userId
        inviterId = parseInt(referrerId);
        console.log(`[AUTH] [ReferralSystem] Используем referrerId из запроса: ${inviterId}`);
      }
      
      // Расширенная логика создания реферальных связей
      // Обрабатываем для новых пользователей или если явно передан reregister=true
      if ((isNewUser || req.body.reregister === true) && (refCode || inviterId)) {
        try {
          console.log(`[AUTH] [ReferralSystem] Начинаем обработку реферальной связи...`);
          let inviter = null;
          
          // Сначала пробуем найти пользователя по ref_code
          if (refCode) {
            inviter = await storage.getUserByRefCode(refCode);
            if (inviter) {
              console.log(`[AUTH] [ReferralSystem] Найден пригласитель по ref_code ${refCode}: ID ${inviter.id}, Username: ${inviter.username}`);
              inviterId = inviter.id;
            }
          }
          
          // Если не нашли по ref_code или ref_code не был указан, используем userId
          if (!inviter && inviterId && !isNaN(inviterId)) {
            inviter = await storage.getUserById(inviterId);
            if (inviter) {
              console.log(`[AUTH] [ReferralSystem] Найден пригласитель по user_id ${inviterId}: Username: ${inviter.username}`);
            }
          }
          
          // Проверка на самореферальность
          if (inviter && inviter.id === user.id) {
            console.log(`[AUTH] [ReferralSystem] Попытка самореферальности отклонена: ${user.id}`);
            inviter = null;
          }
          
          // Если пригласитель найден, создаем реферальную связь
          if (inviter) {
            // Проверяем, нет ли уже существующей связи
            const existingReferral = await ReferralService.getUserInviter(user.id);
            
            if (!existingReferral) {
              // Создаем реферальную связь (уровень 1)
              const referral = await ReferralService.createReferral({
                user_id: user.id,
                inviter_id: inviter.id,
                level: 1,
                created_at: new Date()
              });
              
              if (referral) {
                console.log(`[AUTH] [ReferralSystem] Создана прямая реферальная связь: пользователь ${user.id} приглашен пользователем ${inviter.id} (ref_code: ${inviter.ref_code})`);
                referrerRegistered = true;
                
                // Теперь создаем связи для вышестоящих уровней (до 20 уровней)
                const chainResult = await ReferralBonusService.createReferralChain(user.id, inviter.id);
                console.log(`[AUTH] [ReferralSystem] Создание реферальной цепочки: ${chainResult.success ? 'успешно' : 'ошибка'}, ${chainResult.message}`);
              }
            } else {
              console.log(`[AUTH] [ReferralSystem] Пользователь ${user.id} уже имеет пригласителя: ${existingReferral.inviter_id}`);
            }
          } else {
            console.log(`[AUTH] [ReferralSystem] Пригласитель не найден: ref_code=${refCode}, user_id=${inviterId}`);
          }
        } catch (error) {
          console.error('[AUTH] [ReferralSystem] Ошибка при создании реферальной связи:', error);
          // Продолжаем выполнение, так как ошибка реферальной системы не критична для аутентификации
        }
      } else if (!isNewUser) {
        console.log(`[AUTH] [ReferralSystem] Пропускаем создание реферальной связи для существующего пользователя: ${user.id}`);
      } else {
        console.log(`[AUTH] [ReferralSystem] Нет реферального параметра в запросе`);
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
      
      // Отправляем успешный ответ с данными пользователя, включая guest_id
      sendSuccess(res, {
        user_id: user.id,
        telegram_id: user.telegram_id,
        guest_id: user.guest_id, // Добавляем guest_id в ответ
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        ref_code: user.ref_code, // Добавляем ref_code для улучшения клиентского опыта
        referrer_registered: referrerRegistered, // Флаг успешной регистрации реферальной связи
        auth_source: 'telegram',
        auth_status: 'verified'
      });
    } catch (error) {
      // Добавим подробную структурированную диагностику ошибки
      let errorMessage = 'Внутренняя ошибка сервера';
      let errorStack = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack || '';
      }
      
      // Структурированное логирование ошибки
      console.error('[AuthController] [Ошибка аутентификации Telegram]', {
        method: 'authenticateTelegram',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        requestInfo: {
          hasAuthData: !!req.body.authData,
          authDataLength: req.body.authData ? req.body.authData.length : 0,
          hasHeaderInitData: !!(req.headers['telegram-init-data'] || req.headers['x-telegram-init-data']),
          referrerId: req.body.referrerId,
          refCode: req.body.refCode,
          startParam: req.body.startParam,
          hasTelegramBotToken: !!AuthController.BOT_TOKEN,
          nodeEnv: process.env.NODE_ENV || 'не указан'
        }
      });
      
      // В режиме разработки выводим полный стек ошибки
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthController] [Стек ошибки]:', errorStack);
      }
      
      sendServerError(res, error);
    }
  }
}