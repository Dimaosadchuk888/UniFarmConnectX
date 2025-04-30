import { createHmac, createHash } from 'crypto';
import { db } from '../db';
import { users, type InsertUser, type User } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateTelegramInitData, TelegramValidationResult, isForbiddenUserId } from '../utils/telegramUtils';
import { storage } from '../storage';
import { UserService } from './userService';
import { ReferralService } from './referralService';
import { ReferralBonusService } from './referralBonusService';
import { 
  UnauthorizedError, 
  ValidationError, 
  NotFoundError 
} from '../middleware/errorHandler';

/**
 * Интерфейс для аутентификации через Telegram
 */
interface TelegramAuthData {
  authData?: string;
  userId?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  startParam?: string;
  referrerId?: number;
  refCode?: string;
  guest_id?: string;
  testMode?: boolean;
}

/**
 * Интерфейс для регистрации гостевого пользователя
 */
interface GuestRegistrationData {
  guest_id: string;
  username?: string;
  parent_ref_code?: string;
  ref_code?: string;
  airdrop_mode?: boolean;
  telegram_id?: number;
}

/**
 * Интерфейс для регистрации обычного пользователя
 */
interface UserRegistrationData {
  username: string;
  refCode?: string;
  parentRefCode?: string;
  startParam?: string;
  telegram_id?: number;
  guest_id?: string;
}

/**
 * Сервис для аутентификации и регистрации пользователей
 */
export class AuthService {
  private static BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

  /**
   * Проверяет Telegram initData и аутентифицирует пользователя
   */
  static async authenticateTelegram(authData: TelegramAuthData, isDevelopment: boolean = false): Promise<User> {
    // Проверяем наличие данных аутентификации
    if (!authData.authData) {
      throw new ValidationError('Отсутствуют данные аутентификации');
    }

    // Проверяем наличие токена бота
    if (!this.BOT_TOKEN && !isDevelopment) {
      console.error('[АУДИТ] КРИТИЧЕСКАЯ ОШИБКА: TELEGRAM_BOT_TOKEN не установлен');
      // Проверяем секрет в окружении
      console.log('[АУДИТ] Проверка переменных окружения:', {
        hasTelegramBotToken: !!process.env.TELEGRAM_BOT_TOKEN,
        envKeys: Object.keys(process.env).filter(key => key.includes('TELEGRAM') || key.includes('BOT')),
        nodeEnv: process.env.NODE_ENV
      });

      throw new Error('Ошибка конфигурации сервера. Пожалуйста, свяжитесь с поддержкой.');
    }

    // Парсим данные из строки query-параметров
    const authParams = new URLSearchParams(authData.authData);
    
    // Извлекаем необходимые параметры
    const hashFromTelegram = authParams.get('hash');
    const authDate = authParams.get('auth_date');
    
    if (!hashFromTelegram) {
      throw new ValidationError('Отсутствует хеш подписи в данных аутентификации');
    }
    
    if (!authDate) {
      throw new ValidationError('Отсутствует дата аутентификации');
    }

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
    
    if (!parsedUserId && !authData.userId) {
      throw new ValidationError('Отсутствует ID пользователя Telegram');
    }

    // Проверка на тестовый режим
    const testModeParam = authData.testMode === true || authParams.get('test_mode') === 'true';
    const isTestMode = isDevelopment && testModeParam;
    
    // Проверяем подпись и валидность данных Telegram
    const validationResult: TelegramValidationResult = validateTelegramInitData(
      authData.authData,
      this.BOT_TOKEN,
      {
        maxAgeSeconds: 86400, // 24 часа по умолчанию
        isDevelopment: isTestMode || process.env.NODE_ENV !== 'production',
        requireUserId: !isTestMode, // В тестовом режиме не требуем userId
        allowFallbackId: isTestMode // В продакшене запрещаем ID=1
      }
    );
    
    // Проверяем результаты валидации
    if (!validationResult.isValid && !isTestMode) {
      console.error("[АУДИТ] ОШИБКА: Данные инициализации Telegram недействительны");
      console.error("[АУДИТ] Причины:", validationResult.validationErrors);
      throw new UnauthorizedError('Данные аутентификации Telegram недействительны');
    }
    
    // Дополнительная проверка на запрещенные ID (например, ID=1 в продакшене)
    if (isForbiddenUserId(validationResult.userId) && !isTestMode) {
      console.error("[АУДИТ] КРИТИЧЕСКАЯ ОШИБКА: Использование запрещенного userId:", validationResult.userId);
      throw new ValidationError('Недопустимый ID пользователя');
    }
    
    // Используем userId из валидационного результата, если он доступен
    let telegramUserId = validationResult.userId || parsedUserId || authData.userId;
    
    // Пытаемся найти пользователя по Telegram ID или guest_id
    let user = null;
    let isNewUser = false;
    let referrerRegistered = false;
    
    // Сначала ищем по Telegram ID, если он есть
    if (telegramUserId) {
      user = await storage.getUserByTelegramId(telegramUserId);
    }
    
    // Если не нашли пользователя по Telegram ID, ищем по guest_id (если он предоставлен)
    if (!user && authData.guest_id) {
      console.log(`[AUTH] Ищем пользователя по guest_id: ${authData.guest_id}`);
      user = await storage.getUserByGuestId(authData.guest_id);
      
      // Если нашли пользователя по guest_id и есть Telegram ID, обновляем его
      if (user && telegramUserId) {
        console.log(`[AUTH] Найден пользователь по guest_id, привязываем Telegram ID: ${telegramUserId}`);
        user = await storage.updateUser(user.id, { telegram_id: telegramUserId });
      }
    }
    
    // Если пользователь не найден, создаем его
    if (!user) {
      isNewUser = true;
      
      // Генерируем уникальный реферальный код
      const refCode = await this.generateUniqueRefCode();
      console.log(`[AUTH] Сгенерирован новый реферальный код: ${refCode}`);
      
      // Проверяем, есть ли реферальный код в запросе
      const useRefCode = authData.refCode || validationResult.startParam;
      
      // Определяем родительский ID для реферальной системы
      let parentId: number | null = null;
      
      if (useRefCode) {
        // Проверяем реферальный код
        const parentUser = await storage.getUserByRefCode(useRefCode);
        if (parentUser) {
          parentId = parentUser.id;
          referrerRegistered = true;
          console.log(`[AUTH] Найден реферер с ID ${parentId} по коду ${useRefCode}`);
        } else {
          console.log(`[AUTH] Реферер с кодом ${useRefCode} не найден`);
        }
      }
      
      // Имя пользователя - из параметров или из Telegram
      const username = authData.username || validationResult.username || parsedUsername || (validationResult.firstName ? `user_${telegramUserId}` : `user_${Date.now()}`);
      
      // Создаем нового пользователя
      user = await storage.createUser({
        username,
        ref_code: refCode,
        telegram_id: telegramUserId || null,
        parent_id: parentId,
        parent_ref_code: useRefCode || null,
        guest_id: authData.guest_id || null,
        first_name: authData.firstName || validationResult.firstName || parsedFirstName || null,
        last_name: authData.lastName || validationResult.lastName || null,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
      
      console.log(`[AUTH] Создан новый пользователь: ${JSON.stringify(user)}`);
      
      // Если был указан реферальный код, начисляем бонусы
      if (parentId && referrerRegistered) {
        await ReferralBonusService.processRegistrationBonus(user.id, parentId);
        console.log(`[AUTH] Начислены реферальные бонусы для реферера ${parentId}`);
      }
    } else {
      console.log(`[AUTH] Пользователь найден: ${JSON.stringify(user)}`);
    }
    
    // Создаем или обновляем сессию пользователя
    const sessionId = await this.createOrUpdateSession(user.id);
    
    return user;
  }

  /**
   * Регистрирует гостевого пользователя по guest_id
   */
  static async registerGuestUser(data: GuestRegistrationData): Promise<User> {
    // Проверяем наличие guest_id
    if (!data.guest_id) {
      throw new ValidationError('Отсутствует идентификатор гостя');
    }
    
    // Проверяем, существует ли пользователь с таким guest_id
    const existingUser = await storage.getUserByGuestId(data.guest_id);
    if (existingUser) {
      console.log(`[AirDrop] Пользователь с guest_id ${data.guest_id} уже существует:`, existingUser);
      return existingUser;
    }
    
    // Генерируем уникальный реферальный код
    const refCode = await this.generateUniqueRefCode();
    
    // Определяем родительский ID для реферальной системы
    let parentId: number | null = null;
    const parentRefCode = data.parent_ref_code || data.ref_code;
    
    if (parentRefCode) {
      // Проверяем реферальный код
      const parentUser = await storage.getUserByRefCode(parentRefCode);
      if (parentUser) {
        parentId = parentUser.id;
        console.log(`[AirDrop] Найден реферер с ID ${parentId} по коду ${parentRefCode}`);
      } else {
        console.log(`[AirDrop] Реферер с кодом ${parentRefCode} не найден`);
      }
    }
    
    // Имя пользователя - из параметров или генерируем
    const username = data.username || `guest_${Date.now().toString().substring(7)}`;
    
    // Создаем нового пользователя
    const newUser = await storage.createUser({
      username,
      ref_code: refCode,
      telegram_id: data.telegram_id || null,
      parent_id: parentId,
      parent_ref_code: parentRefCode || null,
      guest_id: data.guest_id,
      first_name: null,
      last_name: null,
      balance: data.airdrop_mode ? 0 : 10, // В режиме AirDrop начальный баланс 0, иначе 10
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[AirDrop] Пользователь успешно создан в режиме ${data.airdrop_mode ? 'AirDrop' : 'стандартный'}: ID=${newUser.id}, guest_id=${newUser.guest_id}, ref_code=${newUser.ref_code}`);
    
    // Если был указан реферальный код, начисляем бонусы
    if (parentId) {
      await ReferralBonusService.processRegistrationBonus(newUser.id, parentId);
      console.log(`[AirDrop] Начислены реферальные бонусы для реферера ${parentId}`);
    }
    
    return newUser;
  }

  /**
   * Регистрирует обычного пользователя
   */
  static async registerUser(data: UserRegistrationData): Promise<User> {
    // Проверяем обязательные поля
    if (!data.username) {
      throw new ValidationError('Имя пользователя обязательно');
    }
    
    // Проверяем, существует ли пользователь с таким именем
    const existingUserByName = await storage.getUserByUsername(data.username);
    if (existingUserByName) {
      throw new ValidationError('Пользователь с таким именем уже существует');
    }
    
    // Если указан telegram_id, проверяем его тоже
    if (data.telegram_id) {
      const existingUserByTelegram = await storage.getUserByTelegramId(data.telegram_id);
      if (existingUserByTelegram) {
        throw new ValidationError('Пользователь с таким Telegram ID уже существует');
      }
    }
    
    // Если указан guest_id, проверяем его тоже
    if (data.guest_id) {
      const existingUserByGuest = await storage.getUserByGuestId(data.guest_id);
      if (existingUserByGuest) {
        throw new ValidationError('Пользователь с таким Guest ID уже существует');
      }
    }
    
    // Генерируем уникальный реферальный код
    const refCode = await this.generateUniqueRefCode();
    
    // Определяем родительский ID для реферальной системы
    let parentId: number | null = null;
    const parentRefCode = data.parentRefCode || data.refCode || data.startParam;
    
    if (parentRefCode) {
      // Проверяем реферальный код
      const parentUser = await storage.getUserByRefCode(parentRefCode);
      if (parentUser) {
        parentId = parentUser.id;
        console.log(`[Register] Найден реферер с ID ${parentId} по коду ${parentRefCode}`);
      }
    }
    
    // Создаем нового пользователя
    const newUser = await storage.createUser({
      username: data.username,
      ref_code: refCode,
      telegram_id: data.telegram_id || null,
      parent_id: parentId,
      parent_ref_code: parentRefCode || null,
      guest_id: data.guest_id || null,
      first_name: null,
      last_name: null,
      balance: 10, // Начальный баланс 10
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`[Register] Пользователь успешно создан: ID=${newUser.id}, username=${newUser.username}, ref_code=${newUser.ref_code}`);
    
    // Если был указан реферальный код, начисляем бонусы
    if (parentId) {
      await ReferralBonusService.processRegistrationBonus(newUser.id, parentId);
      console.log(`[Register] Начислены реферальные бонусы для реферера ${parentId}`);
    }
    
    return newUser;
  }

  /**
   * Генерирует уникальный реферальный код
   */
  private static async generateUniqueRefCode(): Promise<string> {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8;
    
    let refCode: string;
    let isUnique = false;
    
    do {
      refCode = '';
      for (let i = 0; i < length; i++) {
        refCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Проверяем уникальность кода
      const existingUser = await storage.getUserByRefCode(refCode);
      isUnique = !existingUser;
      
    } while (!isUnique);
    
    return refCode;
  }

  /**
   * Создает или обновляет сессию пользователя
   */
  private static async createOrUpdateSession(userId: number): Promise<string> {
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      // Здесь нужно будет использовать SessionService, когда он будет создан
      // ... (добавить логику работы с сессиями)
      return sessionId;
    } catch (error) {
      console.error('[AUTH] Ошибка при создании сессии:', error);
      throw error;
    }
  }
}