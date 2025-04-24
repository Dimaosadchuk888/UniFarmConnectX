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

/**
 * Контроллер для работы с пользователями
 */
export class UserController {
  /**
   * Получает информацию о текущем пользователе через Telegram Auth
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
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
      
      // Если не нашли, логируем информацию обо всех заголовках
      if (!telegramInitData) {
        console.warn(`[АУДИТ] [UserController] No Telegram data found in headers`);
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
          
          // Дополнительно логируем данные для диагностики
          logTelegramData(telegramInitData, null, 'UserController');
          
          // Проверяем подлинность данных с использованием импортированной функции
          const validationResult = validateTelegramInitData(
            telegramInitData,
            botToken,
            {
              maxAgeSeconds: 86400, // 24 часа максимальный возраст данных
              isDevelopment: process.env.NODE_ENV !== 'production',
              requireUserId: process.env.NODE_ENV === 'production', // В продакшн всегда требуем userId
              allowFallbackId: process.env.NODE_ENV !== 'production' // В продакшн запрещаем ID=1
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
            telegramId = validationResult.userId;
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
      
      // В PRODUCTION мы полностью исключаем использование telegram_id из заголовков (п.2.1 ТЗ)
      // В DEV режиме можем использовать fallback для удобства разработки
      if (process.env.NODE_ENV === 'development' && !telegramId) {
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
      
      // Если есть telegram_id, ищем пользователя
      if (telegramId) {
        console.log(`[UserController] Searching for user with Telegram ID ${telegramId} (type: ${typeof telegramId})`);
        
        try {
          existingUser = await UserService.getUserByTelegramId(telegramId);
          
          if (existingUser) {
            // Пользователь найден - используем его ID
            userId = existingUser.id;
            console.log(`[UserController] User found with ID ${userId} for Telegram ID ${telegramId}`);
            
            // ПРОВЕРКА И ОБНОВЛЕНИЕ ref_code: если у существующего пользователя нет ref_code, генерируем его
            if (!existingUser.ref_code) {
              const refCode = UserService.generateRefCode();
              console.log(`[UserController] Existing user ${userId} has no ref_code. Generating new ref_code: ${refCode}`);
              
              try {
                await UserService.updateUser(userId, { ref_code: refCode });
                console.log(`[UserController] Updated existing user ${userId} with new ref_code: ${refCode}`);
                
                // Обновляем объект пользователя
                existingUser = await UserService.getUserById(userId);
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
          const refCode = UserService.generateRefCode();
          console.log(`[UserController] [TelegramAuth] Generated ref_code for new user: "${refCode}"`);
          
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
                const referral = await ReferralService.createReferralRelationship(userId, refInviterId, 1);
                
                if (referral) {
                  console.log(`[UserController] [ReferralSystem] Successfully created referral ID=${referral.id}`);
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
      // Если у пользователя все еще нет ref_code, генерируем его
      if (!user.ref_code) {
        const refCode = UserService.generateRefCode();
        console.log(`[UserController] User ${userId} missing ref_code. Generating new one: ${refCode}`);
        
        try {
          await UserService.updateUser(userId, { ref_code: refCode });
          console.log(`[UserController] Successfully updated user ${userId} with new ref_code: ${refCode}`);
          
          // Обновляем объект пользователя с новым ref_code
          user = await UserService.getUserById(userId);
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
      
      // Если ref_code не задан явно, генерируем его
      if (!userData.ref_code) {
        userData.ref_code = UserService.generateRefCode();
        console.log(`[UserController] [AUDIT] Сгенерирован ref_code для нового пользователя: "${userData.ref_code}"`);
      } else {
        console.log(`[UserController] [AUDIT] Использован предоставленный ref_code: "${userData.ref_code}"`);
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
}