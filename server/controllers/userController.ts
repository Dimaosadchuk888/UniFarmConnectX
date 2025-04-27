import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { UniFarmingService } from '../services/uniFarmingService';
import { NewUniFarmingService } from '../services/newUniFarmingService';
import { sendSuccess, sendError, sendServerError } from '../utils/responseUtils';
import { extractUserId } from '../utils/validationUtils';
import { getUserParamsSchema } from '../validators/schemas';
import { ZodError } from 'zod';
import BigNumber from 'bignumber.js';
import { db } from '../db';
import { uniFarmingDeposits, users } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { validateTelegramInitData, TelegramValidationResult, logTelegramData } from '../utils/telegramUtils';
import { storage } from '../storage';
import 'express-session';

// Для корректной работы с сессией расширяем интерфейс Request
// Это временное решение, обходящее проблему с типизацией express-session
type RequestWithSession = Request & {
  session?: {
    userId?: number;
    user?: {
      id: number;
      username: string;
      ref_code?: string;
      guest_id?: string;
    };
  };
};

/**
 * Контроллер для работы с пользователями
 */
export class UserController {
  /**
   * Получает информацию о текущем пользователе через Telegram Auth
   */
  static async getCurrentUser(req: RequestWithSession, res: Response): Promise<void> {
    try {
      console.log("[UserController] Входящий запрос к /api/me. Сессия:", req.session ? "доступна" : "отсутствует");
      if (req.session) {
        console.log("[UserController] Данные сессии:", {
          userId: req.session.userId,
          userObj: req.session.user ? "установлен" : "отсутствует",
          userObjId: req.session.user?.id,
          userObjRefCode: req.session.user?.ref_code || "отсутствует"
        });
      }
      
      // Тщательно проверяем все возможные заголовки, содержащие данные Telegram
      // ВАЖНО: Используем только верифицированные данные Telegram для авторизации (п.1.2 ТЗ)
      
      // Проверяем все стандартные заголовки (с учетом регистра)
      const telegramDataHeaderNames = [
        'telegram-data', 'Telegram-Data', 'TELEGRAM-DATA',
        'x-telegram-data', 'X-Telegram-Data', 'X-TELEGRAM-DATA',
        'x-telegram-init-data', 'X-Telegram-Init-Data', 'X-TELEGRAM-INIT-DATA',
        'initdata', 'Initdata', 'INITDATA',
        'x-initdata', 'X-Initdata', 'X-INITDATA',
        'telegram-init-data', 'Telegram-Init-Data', 'TELEGRAM-INIT-DATA'
      ];
      
      // Ищем первый непустой заголовок из списка
      let telegramInitData: string | undefined;
      let usedHeaderName: string | undefined;
      
      for (const headerName of telegramDataHeaderNames) {
        const headerValue = req.headers[headerName] as string;
        if (headerValue && headerValue.trim() !== '') {
          telegramInitData = headerValue;
          usedHeaderName = headerName;
          console.log(`[АУДИТ] [UserController] Found Telegram data in header: ${headerName}`);
          break;
        }
      }
      
      // Если не нашли заголовок, проверяем тело запроса и URL-параметры
      if (!telegramInitData) {
        console.warn(`[АУДИТ] [UserController] ⚠️ No Telegram data found in headers`);
        
        // Подробное логирование всех заголовков запроса (КРИТИЧНО для диагностики)
        console.log(`[АУДИТ] [UserController] 🔍 All request headers: ${JSON.stringify(req.headers)}`);
        
        // Проверяем все возможные ключи заголовков, которые содержат критические слова
        const criticalHeaderPatterns = ['telegram', 'init', 'data', 'tg', 'user'];
        
        // Собираем и выводим все заголовки, содержащие хотя бы одно ключевое слово
        Object.keys(req.headers).forEach(headerKey => {
          const lcKey = headerKey.toLowerCase();
          if (criticalHeaderPatterns.some(pattern => lcKey.includes(pattern))) {
            const headerValue = req.headers[headerKey];
            console.log(`[АУДИТ] [UserController] 🔑 Critical header "${headerKey}": ` + 
              (typeof headerValue === 'string' 
                ? `Length ${headerValue.length}, Sample: ${headerValue.substring(0, 30)}...` 
                : `Value: ${headerValue}`));
          }
        });
        
        // Проверяем параметр в URL (могло быть передано в GET запросе)
        if (req.query.initData) {
          telegramInitData = req.query.initData as string;
          console.log(`[UserController] [TelegramAuth] Нашли initData в URL параметрах (длина: ${telegramInitData?.length || 0})`);
        }
        
        // Проверяем тело запроса, если это POST-запрос
        if (!telegramInitData && req.method === 'POST' && req.body) {
          if (typeof req.body === 'object') {
            if (req.body.initData) {
              telegramInitData = req.body.initData;
              console.log(`[UserController] [TelegramAuth] Нашли initData в теле запроса (длина: ${telegramInitData?.length || 0})`);
            } else if (req.body.telegram_data) {
              telegramInitData = req.body.telegram_data;
              console.log(`[UserController] [TelegramAuth] Нашли telegram_data в теле запроса (длина: ${telegramInitData?.length || 0})`);
            }
          }
        }
      }
      
      let telegramId: number | null = null;
      let userId: number | null = null;
      let username: string | null = null;
      let firstName: string | null = null;
      let lastName: string | null = null;
      let startParam: string | null = null;
      let languageCode = 'ru'; // По умолчанию русский
      
      console.log(`[UserController] [АУДИТ] Запрос на /api/me, SOURCE: ${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`);
      
      // АУДИТ: Подробный лог всех заголовков запроса для диагностики
      console.log('[АУДИТ] [UserController] All headers:', req.headers);
      
      // АУДИТ: Отдельно логируем все Telegram заголовки
      const telegramHeaders = Object.keys(req.headers).filter(h => 
        h.toLowerCase().includes('telegram') || 
        h.toLowerCase().startsWith('x-') || 
        h.toLowerCase().includes('init')
      );
      console.log('[АУДИТ] [UserController] Telegram-related headers:', 
        JSON.stringify(telegramHeaders));
      
      // АУДИТ: Проверяем значение telegramInitData
      console.log('[АУДИТ] [UserController] telegramInitData value (first 100 chars):', 
        telegramInitData ? telegramInitData.substring(0, 100) + '...' : 'null or empty');
        
      // Логируем наличие параметра start для реферальной системы
      startParam = req.query.start as string || req.headers['x-start-param'] as string;
      if (startParam) {
        console.log(`[UserController] [ReferralSystem] Detected start parameter: ${startParam}`);
      }
      
      // Обработка реферального кода из startParam (пункт 2.2 ТЗ)
      let refInviterId: number | null = null;
      let refCode: string | null = null;
      
      if (startParam) {
        try {
          const { ReferralService } = await import('../services/referralService');
          const startParamResult = await ReferralService.processStartParam(startParam);
          refInviterId = startParamResult.inviterId;
          refCode = startParamResult.refCode;
          
          if (refInviterId) {
            console.log(`[UserController] [ReferralSystem] Processed startParam. Found inviter ID: ${refInviterId}, refCode: ${refCode}`);
          } else {
            console.log(`[UserController] [ReferralSystem] Processed startParam. No valid inviter found for refCode: ${refCode || 'none'}`);
          }
        } catch (error) {
          console.error(`[UserController] [ReferralSystem] Error processing startParam:`, error);
        }
      }
      
      // 1. УЛУЧШЕННОЕ ПОЛУЧЕНИЕ TELEGRAM ID ЧЕРЕЗ ВЕРИФИКАЦИЮ ДАННЫХ
      // ============================================================
      
      // Согласно п.1.2 ТЗ используем только верифицированные данные Telegram для авторизации
      if (telegramInitData) {
        try {
          console.log('[UserController] [TelegramAuth] Validating Telegram initData using telegramUtils...');
          
          // Получаем токен бота из переменных окружения
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          // Проверяем наличие и валидность токена бота
          if (!botToken) {
            console.error('[UserController] [TelegramAuth] ⚠️ КРИТИЧЕСКАЯ ОШИБКА: Отсутствует токен бота TELEGRAM_BOT_TOKEN!');
            console.error('[UserController] [TelegramAuth] Убедитесь, что TELEGRAM_BOT_TOKEN установлен в переменных окружения');
          } else {
            console.log('[UserController] [TelegramAuth] ✅ Токен бота получен, длина:', botToken.length);
          }
          
          // Дополнительно логируем данные для диагностики
          logTelegramData(telegramInitData, null, 'UserController');
          
          // Добавляем подробное логирование перед валидацией
          console.log('[UserController] [TelegramAuth] Начинаем валидацию initData с длиной:', 
            telegramInitData ? telegramInitData.length : 0);
          
          // Проверяем подлинность данных с использованием импортированной функции
          // Увеличиваем максимальный возраст данных до 48 часов для решения проблемы с устаревшими данными
          // и включаем расширенное логирование
          const validationResult = validateTelegramInitData(
            telegramInitData,
            botToken,
            {
              maxAgeSeconds: 172800, // 48 часов максимальный возраст данных (увеличено для решения проблемы)
              isDevelopment: process.env.NODE_ENV !== 'production',
              requireUserId: process.env.NODE_ENV === 'production', // В продакшн всегда требуем userId
              allowFallbackId: process.env.NODE_ENV !== 'production', // В продакшн запрещаем ID=1
              verboseLogging: true, // Включаем расширенное логирование всегда
              skipSignatureCheck: process.env.NODE_ENV !== 'production' // Пропускаем проверку подписи только в dev-режиме
            }
          );
          
          // Логируем результат валидации
          console.log('[UserController] [TelegramAuth] Validation result:', {
            isValid: validationResult.isValid,
            userId: validationResult.userId,
            username: validationResult.username,
            startParam: validationResult.startParam,
            errors: validationResult.validationErrors || 'none'
          });
          
          // Если данные прошли проверку, используем полученные значения
          if (validationResult.isValid) {
            telegramId = validationResult.userId !== undefined ? validationResult.userId : null;
            username = validationResult.username || username;
            firstName = validationResult.firstName || null;
            lastName = validationResult.lastName || null;
            startParam = validationResult.startParam || startParam;
            
            console.log(`[UserController] [TelegramAuth] Using verified Telegram ID: ${telegramId}`);
          } else {
            console.warn('[UserController] [TelegramAuth] Telegram data validation failed:', 
              validationResult.validationErrors);
              
            // В режиме разработки продолжаем использовать непроверенные данные
            if (process.env.NODE_ENV !== 'production') {
              console.log('[UserController] [DEV] Continuing with unverified data in development mode');
            } else {
              console.error('[UserController] [PROD] Rejecting unverified Telegram data in production');
              // В продакшн сбрасываем Telegram ID, если валидация не прошла
              telegramId = null;
            }
          }
        } catch (validationError) {
          console.error('[UserController] Error during Telegram data validation:', validationError);
        }
      }
      
      // Проверяем наличие guest_id в разных источниках
      let guestId: string | undefined;
      
      // 1. Проверяем query параметры
      if (req.query.guest_id) {
        guestId = req.query.guest_id as string;
        console.log(`[UserController] Found guest_id in query params: ${guestId}`);
      }
      
      // 2. Проверяем HTTP заголовки
      if (!guestId) {
        const guestIdHeaders = [
          'guest-id', 'Guest-Id', 'GUEST-ID', 
          'x-guest-id', 'X-Guest-Id', 'X-GUEST-ID'
        ];
        
        for (const headerName of guestIdHeaders) {
          const headerValue = req.headers[headerName] as string;
          if (headerValue && headerValue.trim() !== '') {
            guestId = headerValue;
            console.log(`[UserController] Found guest_id in header ${headerName}: ${guestId}`);
            break;
          }
        }
      }
      
      // 3. Проверяем тело запроса
      if (!guestId && req.method === 'POST' && req.body) {
        if (typeof req.body === 'object' && req.body.guest_id) {
          guestId = req.body.guest_id;
          console.log(`[UserController] Found guest_id in request body: ${guestId}`);
        }
      }
      
      // В PRODUCTION мы полностью исключаем использование telegram_id из заголовков (п.2.1 ТЗ)
      // В DEV режиме можем использовать fallback для удобства разработки
      if (process.env.NODE_ENV === 'development' && !telegramId && !guestId) {
        console.log('[UserController] В режиме разработки включен fallback для Telegram ID');
        
        // Только для режима разработки - создаем тестового пользователя с ID=1
        telegramId = 1;
        console.log(`[UserController] [DEV] Using development test ID: ${telegramId}`);
        
        // Отмечаем в логах для аудита, что используется тестовый ID
        console.log('===[Telegram User ID Check]=== Используется тестовый ID для разработки =1');
      }
      
      // 2. ПОИСК ИЛИ СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ
      // ====================================

      let existingUser = null;
      
      // ПЕРВЫЙ ПРИОРИТЕТ: Проверяем наличие пользователя в Express-сессии
      // Это исправляет проблему с разгерметизацией данных между /api/session/restore и /api/me
      if (req.session && req.session.userId) {
        const sessionUserId = req.session.userId;
        console.log(`[UserController] ВЫСОКИЙ ПРИОРИТЕТ: Найден userId ${sessionUserId} в активной сессии`);
        
        try {
          // Загружаем пользователя из базы данных по ID из сессии
          existingUser = await UserService.getUserById(sessionUserId);
          
          if (existingUser) {
            // Пользователь найден в сессии - устанавливаем его ID
            userId = sessionUserId;
            console.log(`[UserController] ✅ Успешно загружен пользователь из сессии: ID=${userId}, ref_code=${existingUser.ref_code || 'нет'}`);
            
            // Дополнительный аудит для отладки
            if (req.session.user) {
              console.log(`[UserController] Сверка данных сессии:`, {
                sessionUserId: req.session.userId,
                userIdFromUserObj: req.session.user.id,
                sessionRefCode: req.session.user.ref_code || 'нет',
                actualRefCode: existingUser.ref_code || 'нет'
              });
            }
          } else {
            console.warn(`[UserController] ⚠️ Не удалось найти пользователя из сессии с ID=${sessionUserId}`);
            // Сбрасываем userId и existingUser, чтобы продолжить стандартную идентификацию
            userId = null;
            existingUser = null;
          }
        } catch (error) {
          console.error(`[UserController] Ошибка при загрузке пользователя из сессии с ID=${sessionUserId}:`, error);
          userId = null;
          existingUser = null;
        }
      }
      
      // ВТОРОЙ ПРИОРИТЕТ: Если пользователь не найден в сессии, ищем по guest_id
      if (!existingUser && guestId) {
        console.log(`[UserController] Поиск пользователя по guest_id ${guestId} (сессия не найдена)`);
        try {
          existingUser = await UserService.getUserByGuestId(guestId);
          
          if (existingUser) {
            // Пользователь найден - используем его ID
            userId = existingUser.id;
            console.log(`[UserController] User found with ID ${userId} for guest_id ${guestId}`);
            
            // Сохраняем в сессию для последующих запросов
            if (req.session) {
              req.session.userId = userId;
              req.session.user = {
                id: existingUser.id,
                username: existingUser.username || '',
                ref_code: existingUser.ref_code || undefined,
                guest_id: existingUser.guest_id || undefined
              };
              console.log(`[UserController] User data saved to session from guest_id lookup: ID=${userId}`);
            }
          } else {
            console.log(`[UserController] No user found with guest_id ${guestId}`);
          }
        } catch (error) {
          console.error(`[UserController] Error searching for user by guest_id:`, error);
        }
      }
      
      // ТРЕТИЙ ПРИОРИТЕТ: Если пользователь не найден по guest_id и есть telegram_id, ищем по нему
      if (!existingUser && telegramId) {
        console.log(`[UserController] Searching for user with Telegram ID ${telegramId} (type: ${typeof telegramId})`);
        
        try {
          existingUser = await UserService.getUserByTelegramId(telegramId);
          
          if (existingUser) {
            // Пользователь найден - используем его ID
            userId = existingUser.id;
            console.log(`[UserController] User found with ID ${userId} for Telegram ID ${telegramId}`);
            
            // ПРОВЕРКА И ОБНОВЛЕНИЕ ref_code: если у существующего пользователя нет ref_code, генерируем уникальный код
            if (!existingUser.ref_code) {
              console.log(`[UserController] Existing user ${userId} has no ref_code. Generating new unique ref_code...`);
              
              try {
                // Используем generateUniqueRefCode вместо простого generateRefCode
                const refCode = await UserService.generateUniqueRefCode();
                console.log(`[UserController] Generated unique ref_code: ${refCode} for user ${userId}`);
                
                // Используем специализированный метод для обновления реферального кода
                const updatedUser = await UserService.updateUserRefCode(userId, refCode);
                
                if (updatedUser) {
                  existingUser = updatedUser;
                  console.log(`[UserController] ✅ Successfully updated existing user ${userId} with new ref_code: ${refCode}`);
                } else {
                  console.error(`[UserController] ❌ Failed to update existing user ${userId} with ref_code`);
                  
                  // Обновляем объект пользователя, на случай если обновление прошло успешно
                  existingUser = await UserService.getUserById(userId);
                }
                
                console.log(`[UserController] Refreshed user data for ID ${userId}:`, { 
                  id: existingUser?.id, 
                  hasRefCode: !!existingUser?.ref_code,
                  refCode: existingUser?.ref_code || 'still missing'
                });
              } catch (updateError) {
                console.error(`[UserController] Failed to update ref_code for user ${userId}:`, updateError);
              }
            }
          } else {
            console.log(`[UserController] No user found for Telegram ID ${telegramId}. Will create new user.`);
          }
        } catch (searchError) {
          console.error(`[UserController] Error searching for user with telegramId ${telegramId}:`, searchError);
        }
        
        // Если пользователь не найден, создаем нового
        if (!existingUser) {
          console.log(`[UserController] [TelegramAuth] Creating new user for Telegram ID ${telegramId}...`);
          
          // Переменные для имени и фамилии
          let firstName = '';
          let lastName = '';
          
          // Пробуем получить имя и фамилию из разных источников
          if (telegramInitData) {
            if (telegramInitData.includes('=') && telegramInitData.includes('&')) {
              // Из query-params, если данные в таком формате
              const authParams = new URLSearchParams(telegramInitData);
              firstName = authParams.get('first_name') || '';
              lastName = authParams.get('last_name') || '';
            } else {
              // Из JSON, если данные в другом формате
              try {
                const initDataObj = JSON.parse(telegramInitData);
                if (initDataObj.user) {
                  firstName = initDataObj.user.first_name || '';
                  lastName = initDataObj.user.last_name || '';
                }
              } catch (e) {
                console.error('[UserController] [TelegramAuth] Error extracting name from JSON:', e);
              }
            }
          }
          
          console.log(`[UserController] [TelegramAuth] User info: firstName="${firstName}", lastName="${lastName}", username="${username || 'none'}"`);
          
          // Используем имя и фамилию для создания username, если его нет
          if (!username) {
            username = [firstName, lastName].filter(Boolean).join('_');
            if (!username) {
              username = `telegram_${telegramId}`;
            }
          }
          
          console.log(`[UserController] [TelegramAuth] Final username for new user: "${username}"`);
          
          // Генерируем уникальный реферальный код для нового пользователя
          // Используем асинхронный метод для гарантии уникальности
          const refCode = await UserService.generateUniqueRefCode();
          console.log(`[UserController] [TelegramAuth] Generated unique ref_code for new user: "${refCode}"`);
          
          // Добавляем проверку согласно пункту 4 ТЗ
          if (telegramId) {
            console.log(`[ReferralService] Создание пользователя с telegram_id: ${telegramId}, ref_code: ${refCode}`);
          } else {
            console.log(`[ReferralService] ВНИМАНИЕ! Создание пользователя БЕЗ telegram_id, но с ref_code: ${refCode}`);
          }
          
          // Создаем нового пользователя
          try {
            const newUser = await UserService.createUser({
              telegram_id: telegramId,
              username,
              created_at: new Date(),
              updated_at: new Date(),
              balance_uni: '0',
              balance_ton: '0',
              uni_deposit_amount: '0',
              uni_farming_balance: '0',
              uni_farming_rate: '0',
              ton_deposit_amount: '0',
              ton_farming_balance: '0',
              ton_farming_rate: '0',
              ref_code: refCode // Устанавливаем сгенерированный реферальный код
            });
            
            userId = newUser.id;
            existingUser = newUser;
            console.log(`[UserController] Successfully created new user with ID ${userId} for Telegram ID ${telegramId} with ref_code: ${refCode}`);
            
            // Пункт 2.2 ТЗ: Создание реферальной связи, если есть пригласитель
            if (refInviterId && refInviterId !== userId) {
              try {
                console.log(`[UserController] [ReferralSystem] Creating referral relationship: user ${userId} invited by ${refInviterId}`);
                const { ReferralService } = await import('../services/referralService');
                const result = await ReferralService.createReferralRelationship(userId, refInviterId, 1);
                
                if (result && result.referral) {
                  console.log(`[UserController] [ReferralSystem] Successfully created referral ID=${result.referral.id}`);
                } else {
                  console.warn(`[UserController] [ReferralSystem] Failed to create referral relationship`);
                }
              } catch (referralError) {
                console.error(`[UserController] [ReferralSystem] Error creating referral relationship:`, referralError);
              }
            } else if (refInviterId) {
              console.warn(`[UserController] [ReferralSystem] Self-referral attempt detected: userId ${userId} = inviterId ${refInviterId}`);
            }
          } catch (createError) {
            console.error(`[UserController] Failed to create new user for Telegram ID ${telegramId}:`, createError);
          }
        }
      }
      
      // Второй приоритет: Сессия или заголовок user_id (для тестирования API)
      if (!userId) {
        userId = req.query.user_id ? parseInt(req.query.user_id as string) : 
                req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : null;
                
        if (userId) {
          console.log(`[UserController] Using userId ${userId} from query parameters or headers`);
        }
      }
      
      // Третий приоритет (для dev): Тестовый пользователь
      const IS_DEV = process.env.NODE_ENV === 'development';
      if (!userId && IS_DEV) {
        userId = 1; // Тестовый пользователь только для разработки
        console.warn('[UserController] Using test user (ID=1) for development only');
      }
      
      // Проверка наличия userId
      if (!userId || isNaN(userId)) {
        console.error('[UserController] Could not determine user ID');
        return sendError(res, 'Не удалось определить пользователя', 401);
      }

      // Получаем актуальные данные пользователя по ID
      let user = existingUser;
      
      // Если еще не загрузили пользователя, загружаем его
      if (!user) {
        user = await UserService.getUserById(userId);
      }

      if (!user) {
        console.error(`[UserController] User with ID ${userId} not found`);
        return sendError(res, 'Пользователь не найден', 404);
      }
      
      // ПРОВЕРКА НАЛИЧИЯ ref_code У ПОЛЬЗОВАТЕЛЯ
      // ========================================
      // Если у пользователя все еще нет ref_code, генерируем уникальный код
      if (!user.ref_code) {
        console.log(`[UserController] User ${userId} missing ref_code. Generating new unique ref_code...`);
        
        try {
          // Используем generateUniqueRefCode вместо простого generateRefCode
          // для гарантии уникальности кода
          const refCode = await UserService.generateUniqueRefCode();
          console.log(`[UserController] Generated unique ref_code: ${refCode} for user ${userId}`);
          
          // Обновляем пользователя с новым кодом через UserService.updateUserRefCode
          // который специально оптимизирован для обновления реферальных кодов
          const updatedUser = await UserService.updateUserRefCode(userId, refCode);
          
          if (updatedUser) {
            user = updatedUser;
            console.log(`[UserController] ✅ Successfully updated user ${userId} with new ref_code: ${refCode}`);
          } else {
            console.error(`[UserController] ❌ Failed to update user ${userId} with new ref_code`);
            
            // Пробуем получить пользователя повторно, на случай если обновление прошло успешно,
            // но метод вернул undefined из-за ошибки
            user = await UserService.getUserById(userId);
          }
          
          console.log(`[UserController] Updated user data:`, { 
            id: user?.id, 
            refCodePresent: !!user?.ref_code,
            refCode: user?.ref_code || 'failed to update'
          });
        } catch (updateError) {
          console.error(`[UserController] Failed to update ref_code for final user check ${userId}:`, updateError);
        }
      }
      
      // Добавляем проверку на null
      if (!user) {
        console.error(`[UserController] User with ID ${userId} missing after all checks`);
        return sendError(res, 'Пользователь не найден', 404);
      }
      
      // Финальный лог перед отправкой данных
      console.log(`[UserController] Returning user data for ID ${userId}:`, {
        id: user.id,
        telegramId: user.telegram_id,
        hasRefCode: !!user.ref_code,
        refCode: user.ref_code || 'missing'
      });
      
      sendSuccess(res, {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        language: languageCode,
        ref_code: user.ref_code
      });
    } catch (error) {
      console.error('[UserController] Error in getCurrentUser:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Получает информацию о пользователе по ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      // Если передан параметр telegram_id, используем его вместо обычного id
      const telegramId = req.query.telegram_id;
      if (telegramId) {
        console.log(`[UserController] Trying to get user by telegram_id: ${telegramId}`);
        try {
          const user = await UserService.getUserByTelegramId(parseInt(telegramId as string));
          if (!user) {
            return sendError(res, `User with telegram_id ${telegramId} not found`, 404);
          }
          return sendSuccess(res, user);
        } catch (err) {
          console.error(`[UserController] Error getting user by telegram_id ${telegramId}:`, err);
          return sendError(res, 'Error retrieving user by Telegram ID', 500);
        }
      }
      
      // Стандартная обработка - получение по ID
      const validationResult = getUserParamsSchema.safeParse(req.params);
      if (!validationResult.success) {
        return sendError(res, 'Invalid user ID', 400, validationResult.error.format());
      }

      const userId = parseInt(req.params.id);
      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, user);
    } catch (error) {
      console.error('Error in getUserById:', error);
      sendServerError(res, error);
    }
  }
  
  /**
   * Получает информацию о пользователе по guest_id
   * 
   * Этот метод необходим для клиентской части, которая проверяет наличие пользователя 
   * перед созданием нового аккаунта при входе через Telegram Mini App.
   * 
   * Позволяет избежать дублирования аккаунтов при повторных входах пользователя,
   * даже если они меняют Telegram-аккаунты или устройства.
   * 
   * @param req Запрос с guest_id в параметрах
   * @param res Ответ с данными пользователя или ошибкой
   */
  static async getUserByGuestId(req: Request, res: Response): Promise<void> {
    try {
      const guestId = req.params.guestId;
      
      if (!guestId) {
        return sendError(res, 'Guest ID is required', 400);
      }
      
      console.log(`[UserController] Поиск пользователя по guest_id: ${guestId}`);
      
      const user = await UserService.getUserByGuestId(guestId);
      
      if (!user) {
        console.log(`[UserController] Пользователь с guest_id ${guestId} не найден`);
        return sendError(res, 'User not found', 404);
      }
      
      console.log(`[UserController] Найден пользователь с ID=${user.id} для guest_id=${guestId}`);
      sendSuccess(res, user);
    } catch (error) {
      console.error(`[UserController] Ошибка при получении пользователя по guest_id:`, error);
      sendServerError(res, error);
    }
  }

  /**
   * Создает нового пользователя
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Здесь должна быть валидация тела запроса
      const userData = req.body;
      
      let wasNewUser = true;
      
      // Проверка на существование пользователя с таким telegram_id
      if (userData.telegram_id) {
        console.log(`[UserController] [AUDIT] createUser запрошено с telegram_id: ${userData.telegram_id}`);
        const existingUser = await UserService.getUserByTelegramId(userData.telegram_id);
        if (existingUser) {
          console.log(`[UserController] [AUDIT] Пользователь с telegram_id ${userData.telegram_id} уже существует. ID: ${existingUser.id}, ref_code: ${existingUser.ref_code || 'НЕ УСТАНОВЛЕН'}`);
          wasNewUser = false;
          return sendError(res, 'User with this Telegram ID already exists', 409);
        }
      } else {
        console.log(`[UserController] [AUDIT] createUser запрошено БЕЗ telegram_id. Данные:`, userData);
      }
      
      // Если ref_code не задан явно, он будет сгенерирован автоматически при создании пользователя
      // Нам не нужно вызывать generateUniqueRefCode() здесь, так как это уже реализовано в методах storage
      // Тем не менее, мы можем использовать предоставленный ref_code, если он есть
      if (userData.ref_code) {
        console.log(`[UserController] [AUDIT] Использован предоставленный ref_code: "${userData.ref_code}"`);
        
        // Проверим уникальность предоставленного ref_code
        const isUnique = await UserService.isRefCodeUnique(userData.ref_code);
        if (!isUnique) {
          console.log(`[UserController] [AUDIT] Предоставленный ref_code "${userData.ref_code}" уже используется. Будет сгенерирован новый.`);
          // Устанавливаем undefined, чтобы методы storage сгенерировали новый код автоматически
          userData.ref_code = undefined;
        }
      } else {
        console.log(`[UserController] [AUDIT] ref_code не предоставлен, будет сгенерирован автоматически`);
      }

      const newUser = await UserService.createUser(userData);
      console.log(`[UserController] [AUDIT] Пользователь создан: telegram_id=${userData.telegram_id || 'N/A'}, wasNewUser=${wasNewUser}, ref_code="${newUser.ref_code}", userId=${newUser.id}`);
      sendSuccess(res, newUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return sendError(res, 'Invalid user data', 400, error.format());
      }
      sendServerError(res, error);
    }
  }

  /**
   * Обновляет данные пользователя
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = extractUserId(req, 'params');
      
      if (!userId) {
        return sendError(res, 'Invalid user ID', 400);
      }

      const userData = req.body;
      const updatedUser = await UserService.updateUser(userId, userData);

      if (!updatedUser) {
        return sendError(res, 'User not found', 404);
      }

      sendSuccess(res, updatedUser);
    } catch (error) {
      sendServerError(res, error);
    }
  }

  /**
   * Получает информацию о балансе пользователя
   */
  static async getUserBalance(req: Request, res: Response): Promise<void> {
    try {
      // Получаем user_id из параметров запроса
      const userId = parseInt(req.query.user_id as string);
      
      if (isNaN(userId)) {
        return sendError(res, 'Invalid user ID', 400);
      }
      
      // Проверяем наличие новых депозитов
      const newDeposits = await db
        .select()
        .from(uniFarmingDeposits)
        .where(and(
          eq(uniFarmingDeposits.user_id, userId),
          eq(uniFarmingDeposits.is_active, true)
        ));
      
      // Обновляем фарминг перед получением данных из базы
      // Это гарантирует, что мы получим актуальный баланс
      try {
        if (newDeposits.length > 0) {
          // Если есть новые депозиты, используем новый сервис
          await NewUniFarmingService.calculateAndUpdateUserFarming(userId);
        } else {
          // Иначе используем старый сервис для обратной совместимости
          await UniFarmingService.calculateAndUpdateUserFarming(userId);
        }
      } catch (farmingError) {
        console.error('[getUserBalance] Error updating farming before balance fetch:', farmingError);
        // Не возвращаем ошибку, так как основная функция - получение баланса
      }

      // Получаем пользователя с обновленным балансом
      const user = await UserService.getUserById(userId);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      // Форматируем баланс для отображения
      // Увеличиваем количество знаков после запятой для лучшего отслеживания изменений
      
      // Для правильного отображения реалтайм баланса объединяем основной баланс + накопленный фарминг
      const baseUniBalance = new BigNumber(user.balance_uni || 0);
      const farmingAccumulated = new BigNumber(user.uni_farming_balance || 0);
      
      // Создаем виртуальный баланс, добавляя накопленное значение к основному балансу
      // Это позволяет видеть микроизменения до 8 знаков после запятой
      const virtualUniBalance = baseUniBalance.plus(farmingAccumulated);
      
      // Форматируем балансы с увеличенной точностью
      const balanceUni = virtualUniBalance.toFixed(8); // Увеличиваем точность до 8 знаков
      const balanceTon = user.balance_ton ? new BigNumber(user.balance_ton).toFixed(5) : '0.00000';
      
      // Логируем для отладки полное значение как основного, так и виртуального баланса
      console.log(`[getUserBalance] User ${userId} balance: ${baseUniBalance.toFixed(8)} UNI + ${farmingAccumulated.toFixed(8)} (virtual: ${balanceUni})`);

      // Информация о фарминге по умолчанию
      const farmingInfo = {
        active: false,
        depositAmount: '0',
        depositCount: 0,
        ratePerSecond: '0'
      };

      if (newDeposits.length > 0) {
        // Если есть новые депозиты, собираем статистику
        const totalDeposit = newDeposits.reduce((sum, deposit) => 
          sum.plus(new BigNumber(deposit.amount || 0)), new BigNumber(0));
          
        farmingInfo.active = true;
        farmingInfo.depositAmount = totalDeposit.toFixed(2);
        farmingInfo.depositCount = newDeposits.length;
        farmingInfo.ratePerSecond = user.uni_farming_rate || '0';
      }

      sendSuccess(res, {
        balance_uni: balanceUni, 
        balance_ton: balanceTon, 
        farming: farmingInfo
      });
    } catch (error) {
      console.error('[getUserBalance] Error:', error);
      sendServerError(res, error);
    }
  }

  /**
   * Генерирует реферальный код для пользователя
   * Создает новый уникальный код и назначает его пользователю
   * 
   * @param req Запрос, который должен содержать user_id или guest_id в теле
   * @param res Ответ
   */
  static async generateRefCode(req: Request, res: Response): Promise<void> {
    try {
      console.log('[UserController] Запрос на генерацию реферального кода:', req.body);
      
      // Проверяем наличие user_id или guest_id в запросе
      const userId = req.body.user_id;
      const guestId = req.body.guest_id;
      
      if (!userId && !guestId) {
        console.error('[UserController] Ошибка генерации реферального кода: отсутствует user_id или guest_id в запросе');
        return sendError(res, 'Отсутствует ID пользователя или guest_id', 400);
      }
      
      // Переменная для хранения найденного пользователя
      let user: any = null;
      
      // Если есть user_id, ищем пользователя по нему
      if (userId) {
        user = await storage.getUserById(userId);
        if (!user) {
          console.error(`[UserController] Пользователь с ID ${userId} не найден при генерации реферального кода`);
          return sendError(res, `Пользователь с ID ${userId} не найден`, 404);
        }
        console.log(`[UserController] Пользователь найден по ID ${userId} для генерации реферального кода`);
      } 
      // Иначе если есть guest_id, ищем пользователя по нему
      else if (guestId) {
        user = await storage.getUserByGuestId(guestId);
        if (!user) {
          console.error(`[UserController] Пользователь с guest_id ${guestId} не найден при генерации реферального кода`);
          return sendError(res, `Пользователь с guest_id ${guestId} не найден`, 404);
        }
        console.log(`[UserController] Пользователь найден по guest_id ${guestId} для генерации реферального кода, ID=${user.id}`);
      }
      
      // Дополнительная проверка для TypeScript, хотя логически мы уже проверили наличие пользователя выше
      if (!user) {
        console.error('[UserController] Критическая ошибка: пользователь не найден, но проверки не сработали');
        return sendServerError(res, 'Внутренняя ошибка сервера: пользователь не найден');
      }
      
      // Проверяем, есть ли уже реферальный код
      if (user.ref_code) {
        console.log(`[UserController] У пользователя с ID ${user.id} уже есть реферальный код: ${user.ref_code}`);
        return sendSuccess(res, { 
          ref_code: user.ref_code,
          user_id: user.id,
          guest_id: user.guest_id
        });
      }
      
      // Генерируем новый уникальный реферальный код
      const refCode = await storage.generateUniqueRefCode();
      console.log(`[UserController] Сгенерирован новый реферальный код для пользователя ${user.id}: ${refCode}`);
      
      // Обновляем пользователя, добавляя реферальный код
      const updatedUser = await storage.updateUserRefCode(user.id, refCode);
      if (!updatedUser) {
        return sendServerError(res, 'Не удалось обновить реферальный код пользователя');
      }
      
      // Возвращаем успешный результат с новым кодом
      return sendSuccess(res, { 
        ref_code: refCode,
        user_id: user.id,
        guest_id: user.guest_id
      });
      
    } catch (error) {
      console.error('[UserController] Ошибка при генерации реферального кода:', error);
      return sendServerError(res, 'Ошибка при генерации реферального кода');
    }
  }
}