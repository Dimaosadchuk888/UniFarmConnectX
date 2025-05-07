import crypto from 'crypto';
import { storage } from '../storage';
import { User, InsertUser } from '@shared/schema';
import { validateTelegramInitData, TelegramValidationResult } from '../utils/telegramUtils';
import { generateUniqueRefCode } from '../utils/refCodeUtils';
// Используем инстанс-подход вместо статического класса
import { userService, referralBonusService } from './index';

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
    try {
      // 1. Валидация данных Telegram
      const validationResult: TelegramValidationResult = validateTelegramInitData(
        authData.authData || '',
        this.BOT_TOKEN,
        isDevelopment || authData.testMode || false
      );

      if (!validationResult.isValid && !isDevelopment && !authData.testMode) {
        throw new Error(`Ошибка валидации данных Telegram: ${validationResult.errors?.join(', ')}`);
      }

      // 2. Получение идентификатора пользователя
      let telegramUserId = validationResult.userId;

      // Если в режиме разработки или тестирования
      if ((isDevelopment || authData.testMode) && authData.userId && !telegramUserId) {
        telegramUserId = authData.userId;
      }

      if (!telegramUserId && !authData.guest_id) {
        throw new Error('Не удалось определить пользователя Telegram');
      }

      // 3. Поиск пользователя по id Telegram или guest_id
      let user: User | undefined;

      // Приоритет поиска: guest_id > telegram_id
      if (authData.guest_id) {
        user = await userService.getUserByGuestId(authData.guest_id);
      }

      if (!user && telegramUserId) {
        // Метод getUserByTelegramId не существует в текущем сервисе
        // TODO: добавить этот метод в userService
        user = undefined; // Временная заглушка
      }

      // 4. Если пользователь найден, обновим его данные
      if (user) {
        // TODO: Метод updateUser отсутствует в текущем сервисе 
        // Необходимо его добавить в userService
        
        // Вместо этого пока что просто логируем информацию
        console.log(`[AuthService] Необходимо обновить данные пользователя ${user.id}`);
        console.log(`  - Новое имя пользователя: ${authData.username}`);
        console.log(`  - Привязка guest_id: ${authData.guest_id}`);
        
        // Не выполняем обновление, так как метод отсутствует

        return user;
      }

      // 5. Если пользователь не найден, создаем нового
      const username = authData.username || 
                      `user_${telegramUserId || crypto.randomBytes(4).toString('hex')}`;

      // Создаем уникальный реферальный код
      const ref_code = await generateUniqueRefCode();

      // Определяем родительский реферальный код
      const parent_ref_code = authData.startParam || authData.refCode || null;

      // Создаем пользователя
      const newUser: InsertUser = {
        telegram_id: telegramUserId || null,
        guest_id: authData.guest_id || null,
        username,
        wallet: null,
        ton_wallet_address: null,
        ref_code,
        parent_ref_code,
        password: null // Явно указываем null для password
      };

      const createdUser = await storage.createUser(newUser);

      // Обрабатываем реферальный бонус, если указан родительский код
      if (parent_ref_code) {
        await ReferralBonusService.processRegistrationBonus(createdUser.id, parent_ref_code);
      }

      return createdUser;
    } catch (error) {
      console.error('[AuthService] Ошибка аутентификации Telegram:', error);
      throw error;
    }
  }

  /**
   * Регистрирует гостевого пользователя по guest_id
   */
  static async registerGuestUser(data: GuestRegistrationData): Promise<User> {
    try {
      // Проверяем, существует ли пользователь с таким guest_id
      const existingUser = await userService.getUserByGuestId(data.guest_id);
      if (existingUser) {
        return existingUser;
      }

      // Создаем уникальный реферальный код
      const ref_code = data.ref_code || await generateUniqueRefCode();

      // Создаем пользователя в режиме AirDrop
      const newUser: InsertUser = {
        telegram_id: data.telegram_id || null,
        guest_id: data.guest_id,
        username: data.username || `guest_${data.guest_id.substring(0, 8)}`,
        wallet: null,
        ton_wallet_address: null,
        ref_code,
        parent_ref_code: data.parent_ref_code || null,
      };

      const createdUser = await storage.createUser(newUser);

      // Если указан родительский реферальный код, начисляем бонус
      if (data.parent_ref_code) {
        await ReferralBonusService.processRegistrationBonus(createdUser.id, data.parent_ref_code);
      }

      return createdUser;
    } catch (error) {
      console.error('[AuthService] Ошибка регистрации гостевого пользователя:', error);
      throw error;
    }
  }

  /**
   * Регистрирует обычного пользователя
   */
  static async registerUser(data: UserRegistrationData): Promise<User> {
    try {
      // Проверяем, существует ли пользователь с таким именем
      const existingUserByUsername = await userService.getUserByUsername(data.username);
      if (existingUserByUsername) {
        throw new Error(`Пользователь с именем ${data.username} уже существует`);
      }

      // Если указан telegram_id, проверяем, есть ли уже такой пользователь
      // Метод getUserByTelegramId не существует в текущем сервисе
      // TODO: добавить этот метод в userService
      if (data.telegram_id) {
        // Временная заглушка, пропускаем проверку по telegram_id
        console.log(`[AuthService] Пропускаем проверку по telegram_id: ${data.telegram_id}`);
      }

      // Создаем уникальный реферальный код
      const ref_code = data.refCode || await generateUniqueRefCode();

      // Определяем родительский реферальный код
      const parent_ref_code = data.parentRefCode || data.startParam || null;

      // Создаем пользователя
      const newUser: InsertUser = {
        telegram_id: data.telegram_id || null,
        guest_id: data.guest_id || null,
        username: data.username,
        wallet: null,
        ton_wallet_address: null,
        ref_code,
        parent_ref_code,
      };

      const createdUser = await storage.createUser(newUser);

      // Обрабатываем реферальный бонус, если указан родительский код
      if (parent_ref_code) {
        await ReferralBonusService.processRegistrationBonus(createdUser.id, parent_ref_code);
      }

      return createdUser;
    } catch (error) {
      console.error('[AuthService] Ошибка регистрации пользователя:', error);
      throw error;
    }
  }

  /**
   * Создает или обновляет сессию пользователя
   */
  private static async createOrUpdateSession(userId: number): Promise<string> {
    try {
      // Создаем уникальный идентификатор сессии
      const sessionId = crypto.randomUUID();

      // В реальной реализации здесь должно быть сохранение в базу данных или
      // другое хранилище сессий. В данном примере просто возвращаем идентификатор.

      return sessionId;
    } catch (error) {
      console.error('[AuthService] Ошибка создания сессии:', error);
      throw error;
    }
  }
}