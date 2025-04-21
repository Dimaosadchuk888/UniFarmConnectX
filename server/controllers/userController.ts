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

/**
 * Контроллер для работы с пользователями
 */
export class UserController {
  /**
   * Получает информацию о текущем пользователе через Telegram Auth
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // Первый приоритет: Телеграм данные из initData в заголовке
      let telegramInitData = req.headers['telegram-data'] as string || req.headers['x-telegram-data'] as string;
      
      // Проверяем различные заголовки для обратной совместимости
      if (!telegramInitData) {
        telegramInitData = req.headers['x-telegram-init-data'] as string;
      }
      
      let telegramId: number | null = null;
      let userId: number | null = null;
      let username: string | null = null;
      let languageCode = 'ru'; // По умолчанию русский
      
      // Подробный лог всех заголовков для отладки
      console.log('[UserController] [TelegramAuth] All headers:', 
        JSON.stringify(Object.keys(req.headers)));
      
      // Отдельно логируем все Telegram заголовки
      const telegramHeaders = Object.keys(req.headers).filter(h => 
        h.toLowerCase().includes('telegram') || h.toLowerCase().startsWith('x-')
      );
      console.log('[UserController] [TelegramAuth] Telegram-related headers:', 
        JSON.stringify(telegramHeaders));
        
      // Логируем наличие параметра start для реферальной системы
      const startParam = req.query.start || req.headers['x-start-param'];
      if (startParam) {
        console.log(`[UserController] [ReferralSystem] Detected start parameter: ${startParam}`);
      }
        
      // Проверяем наличие пользовательского ID в заголовке
      const headerUserId = req.headers['x-telegram-user-id'] || req.headers['x-user-id'];
      if (headerUserId) {
        console.log(`[UserController] Found user ID in headers: ${headerUserId}`);
        
        // Если у нас нет telegramId из initData, но есть в заголовке, используем его
        if (!telegramId && typeof headerUserId === 'string' && headerUserId.trim() !== '') {
          try {
            telegramId = parseInt(headerUserId);
            console.log(`[UserController] Using user ID from header as telegramId: ${telegramId}`);
          } catch (parseError) {
            console.error(`[UserController] Failed to parse headerUserId: ${headerUserId}`, parseError);
          }
        }
      }
      
      if (telegramInitData) {
        try {
          console.log('[UserController] [TelegramAuth] Got Telegram initData from headers');
          
          // Проверяем, является ли initData корректной строкой в формате query-params
          if (telegramInitData.includes('=') && telegramInitData.includes('&')) {
            // Парсим данные из строки query-параметров
            const authParams = new URLSearchParams(telegramInitData);
            
            // Вывод содержимого в лог (без секретных данных)
            console.log('[UserController] [TelegramAuth] initData contains keys:', 
              JSON.stringify(Array.from(authParams.keys())));
            
            // Извлекаем ID пользователя из Telegram
            telegramId = authParams.get('id') ? parseInt(authParams.get('id')!) : null;
            username = authParams.get('username') || null;
            
            // Если не нашли напрямую id, ищем в user структуре (может быть внутри JSON)
            if (!telegramId && authParams.get('user')) {
              try {
                const userData = JSON.parse(authParams.get('user')!);
                if (userData && userData.id) {
                  telegramId = parseInt(userData.id.toString());
                  username = userData.username || username;
                  console.log('[UserController] [TelegramAuth] Extracted user data from JSON:', 
                    JSON.stringify({ id: telegramId, username }));
                }
              } catch (jsonError) {
                console.error('[UserController] [TelegramAuth] Failed to parse user JSON:', jsonError);
              }
            }
            
            // Получаем язык из Telegram данных
            const langFromTelegram = authParams.get('language_code');
            if (langFromTelegram) {
              languageCode = langFromTelegram;
            }
          } else {
            // Если данные не в формате query-params, возможно это JSON или другой формат
            try {
              const initDataObj = JSON.parse(telegramInitData);
              console.log('[UserController] [TelegramAuth] initData is JSON with keys:', 
                JSON.stringify(Object.keys(initDataObj)));
              
              if (initDataObj.user && initDataObj.user.id) {
                telegramId = parseInt(initDataObj.user.id.toString());
                username = initDataObj.user.username || null;
                console.log('[UserController] [TelegramAuth] Extracted user from JSON format:', 
                  JSON.stringify({ id: telegramId, username }));
              }
              
              if (initDataObj.language_code) {
                languageCode = initDataObj.language_code;
              }
            } catch (jsonError) {
              console.error('[UserController] [TelegramAuth] initData is not valid JSON or query params:', 
                telegramInitData.length > 20 ? 
                  `${telegramInitData.substring(0, 10)}...${telegramInitData.substring(telegramInitData.length - 10)}` : 
                  'data too short');
            }
          }
          
          if (telegramId) {
            console.log(`[UserController] Found Telegram ID: ${telegramId}, searching for user...`);
            
            // Пробуем найти пользователя по Telegram ID с более подробным логированием
            console.log(`[UserController] Searching for user with Telegram ID ${telegramId} (type: ${typeof telegramId})`);
            
            let existingUser = null;
            
            try {
              existingUser = await UserService.getUserByTelegramId(telegramId);
              
              if (existingUser) {
                // Пользователь найден - используем его ID
                userId = existingUser.id;
                console.log(`[UserController] User found with ID ${userId} for Telegram ID ${telegramId}`);
              } else {
                console.log(`[UserController] No user found for Telegram ID ${telegramId}`);
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
              
              console.log(`[UserController] [TelegramAuth] User info: firstName="${firstName}", lastName="${lastName}", username="${username || 'none'}"`);
              
              // Используем имя и фамилию для создания username, если его нет
              if (!username) {
                username = [firstName, lastName].filter(Boolean).join('_');
                if (!username) {
                  username = `telegram_${telegramId}`;
                }
              }
              
              console.log(`[UserController] [TelegramAuth] Final username for new user: "${username}"`);
              
              
              // Создаем нового пользователя
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
                ton_farming_rate: '0'
              });
              
              userId = newUser.id;
              console.log(`[UserController] Created new user with ID ${userId} for Telegram ID ${telegramId}`);
            }
          } else {
            console.warn('[UserController] Telegram initData does not contain user ID');
          }
        } catch (parseError) {
          console.error('[UserController] Error parsing Telegram initData:', parseError);
        }
      } else {
        console.warn('[UserController] No Telegram initData found in headers');
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

      // Получаем пользователя по ID
      const user = await UserService.getUserById(userId);

      if (!user) {
        console.error(`[UserController] User with ID ${userId} not found`);
        return sendError(res, 'Пользователь не найден', 404);
      }

      console.log(`[UserController] Returning user data for ID ${userId}`);
      sendSuccess(res, {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        balance_uni: user.balance_uni,
        balance_ton: user.balance_ton,
        language: languageCode
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
      // Валидация параметров запроса
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
      
      // Проверка на существование пользователя с таким telegram_id
      if (userData.telegram_id) {
        const existingUser = await UserService.getUserByTelegramId(userData.telegram_id);
        if (existingUser) {
          return sendError(res, 'User with this Telegram ID already exists', 409);
        }
      }

      const newUser = await UserService.createUser(userData);
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