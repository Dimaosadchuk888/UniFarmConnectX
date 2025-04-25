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
   * Регистрация нового пользователя по данным из Telegram WebApp initData (ТЗ 2.1)
   */
  static async registerUser(req: Request, res: Response): Promise<void> {
    try {
      // Извлекаем данные из тела запроса
      const {
        telegram_user_id,
        username,
        first_name, 
        last_name,
        photo_url,
        startParam,
        ref_code
      } = req.body;
      
      // Проверяем, что передан ID пользователя Telegram
      if (!telegram_user_id) {
        console.error('[REGISTER] Отсутствует обязательный параметр telegram_user_id');
        return sendError(res, 'Отсутствует ID пользователя Telegram', 400);
      }
      
      // Логируем получение запроса на регистрацию
      console.log(`[REGISTER] Запрос на регистрацию пользователя: ID=${telegram_user_id}, username=${username || 'не указан'}`);
      console.log(`[REGISTER] Дополнительные данные:`, { 
        first_name: first_name || 'не указан', 
        last_name: last_name || 'не указан',
        startParam: startParam || 'не указан',
        ref_code: ref_code || 'не указан'
      });
      
      // Проверяем, существует ли уже пользователь с таким Telegram ID
      let user = await storage.getUserByTelegramId(telegram_user_id);
      let isNewUser = false;
      
      if (user) {
        // Пользователь уже существует, просто возвращаем информацию
        console.log(`[REGISTER] Пользователь уже существует: telegram_id=${telegram_user_id}, user_id=${user.id}`);
      } else {
        // Создаем нового пользователя
        isNewUser = true;
        
        // Генерируем уникальный реферальный код
        const newRefCode = storage.generateRefCode();
        
        // Создаем пользователя
        user = await UserService.createUser({
          telegram_id: telegram_user_id,
          username: username || `user_${telegram_user_id}`,
          balance_uni: "100", // Начальный бонус
          balance_ton: "0",
          ref_code: newRefCode,
          created_at: new Date()
        });
        
        console.log(`[REGISTER] Новый пользователь создан: id=${user.id}, telegram_id=${telegram_user_id}, ref_code=${newRefCode}`);
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
      
      // Отправляем успешный ответ с данными пользователя
      sendSuccess(res, {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        ref_code: user.ref_code,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        is_new_user: isNewUser,
        referrer_registered: referrerRegistered
      });
    } catch (error) {
      console.error('[REGISTER] Ошибка при регистрации пользователя:', error);
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
      const { authData: bodyAuthData, userId: bodyUserId, username: bodyUsername, firstName: bodyFirstName, lastName: bodyLastName, startParam: bodyStartParam, referrerId, refCode: bodyRefCode } = req.body;
      
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
        refCode: bodyRefCode || 'не передан' // Добавляем новое поле refCode
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

      // Пытаемся найти пользователя по Telegram ID
      let user = await UserService.getUserByTelegramId(telegramUserId);
      let isNewUser = false;
      let referrerRegistered = false;
      
      // Если пользователь не найден, создаем нового
      if (!user) {
        isNewUser = true;
        
        // Генерируем уникальный реферальный код
        const refCode = storage.generateRefCode();
        
        user = await UserService.createUser({
          telegram_id: telegramUserId,
          username: parsedUsername || bodyUsername || `user_${telegramUserId}`,
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
          user = await UserService.updateUser(user.id, { username: effectiveUsername });
        }
        
        // Проверяем, есть ли у пользователя ref_code, если нет - генерируем
        if (user && !user.ref_code) {
          const refCode = storage.generateRefCode();
          await storage.updateUserRefCode(user.id, refCode);
          console.log(`Обновлен реферальный код для пользователя ${user.id}: ${refCode}`);
          
          // Обновляем объект пользователя
          const updatedUser = await UserService.getUserById(user.id);
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
      
      // Проверяем формат startapp=ref_{ref_code} только если еще не получили код из bodyRefCode
      if (!refCode && startParam.startsWith('ref_')) {
        refCode = startParam.substring(4);
        console.log(`[AUTH] [ReferralSystem] Обнаружен реферальный код из startParam: ${refCode}`);
      }
      // Поддержка устаревшего формата user{id}
      else if (!refCode && startParam.startsWith('user')) {
        const userId = startParam.substring(4);
        console.log(`[AUTH] [ReferralSystem] Обнаружен устаревший формат с userId: ${userId}`);
        
        // Пытаемся найти пользователя по ID
        if (userId && !isNaN(parseInt(userId))) {
          const foundUser = await UserService.getUserById(parseInt(userId));
          if (foundUser && foundUser.ref_code) {
            refCode = foundUser.ref_code;
            console.log(`[AUTH] [ReferralSystem] Преобразовано в ref_code: ${refCode}`);
          }
        }
      }
      
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
            inviter = await UserService.getUserById(inviterId);
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
          referrerId: req.body.referrerId,
          refCode: req.body.refCode,
          startParam: req.body.startParam
        }
      });
      
      sendServerError(res, error);
    }
  }
}