import crypto from 'crypto';
import { storage } from '../storage-adapter';
import { ValidationError, NotFoundError, ConflictError } from '../utils/responseUtils';
import logger from '../utils/logger';
import { generateRefCode } from '../utils/refCodeUtils';

/**
 * Сервис аутентификации с обязательной Telegram верификацией
 */
export class AuthServiceInstance {
  /**
   * Валидирует initData от Telegram
   */
  async validateTelegramInitData(initData: string): Promise<boolean> {
    try {
      if (!initData || initData.length === 0) {
        throw new ValidationError('Отсутствует initData');
      }

      // Парсим initData
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      const authDate = urlParams.get('auth_date');

      if (!hash) {
        throw new ValidationError('Отсутствует hash в initData');
      }

      if (!authDate) {
        throw new ValidationError('Отсутствует auth_date в initData');
      }

      // В режиме разработки пропускаем криптографическую проверку
      if (process.env.NODE_ENV === 'development') {
        logger.info('[AuthService] Development mode: skipping cryptographic validation');
        return true;
      }

      // Проверяем подпись (только в продакшене)
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        throw new ValidationError('Не настроен TELEGRAM_BOT_TOKEN');
      }

      // Создаем массив данных для проверки
      const dataCheckArr: string[] = [];
      urlParams.forEach((val, key) => {
        if (key !== 'hash') {
          dataCheckArr.push(`${key}=${val}`);
        }
      });

      // Сортируем и создаем строку данных
      dataCheckArr.sort();
      const dataCheckString = dataCheckArr.join('\n');

      // Создаем HMAC-SHA-256 подпис
      const secretKey = crypto.createHmac('sha256', 'WebAppData')
        .update(process.env.TELEGRAM_BOT_TOKEN)
        .digest();

      const calculatedHash = crypto.createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Проверяем подпись
      if (calculatedHash !== hash) {
        throw new ValidationError('Недействительный подпись initData');
      }

      // Проверяем срок действия (24 часа)
      const authDateTimestamp = parseInt(authDate, 10) * 1000;
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 часа

      if (now - authDateTimestamp > maxAge) {
        throw new ValidationError('initData устарел');
      }

      return true;
    } catch (error) {
      logger.error('[AuthService] Ошибка валидации initData:', error);
      throw error;
    }
  }

  /**
   * Аутентификация пользователя через Telegram
   * Создает нового пользователя, если не существует
   */
  async authenticateTelegramUser(userData: {
    telegram_id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    parent_ref_code?: string;
  }): Promise<any> {
    try {
      const { telegram_id, username, first_name, last_name, parent_ref_code } = userData;

      logger.info(`[AuthService] Аутентификация пользователя telegram_id: ${telegram_id}`);

      // Ищем существующего пользователя
      let user = await storage.getUserByTelegramId(telegram_id);

      if (user) {
        // Обновляем данные пользователя, если изменились
        const needsUpdate = 
          user.username !== username ||
          user.first_name !== first_name ||
          user.last_name !== last_name;

        if (needsUpdate) {
          await storage.updateUser(user.id, {
            username,
            first_name,
            last_name,
            updated_at: new Date()
          });

          // Получаем обновленного пользователя
          user = await storage.getUserByTelegramId(telegram_id);
        }

        logger.info(`[AuthService] Существующий пользователь найден: id=${user.id}`);
        return user;
      }

      // Создаем нового пользователя
      logger.info(`[AuthService] Создание нового пользователя для telegram_id: ${telegram_id}`);

      // Генерируем уникальный реферальный код
      const refCode = await generateRefCode();

      // Проверяем родительский реферальный код
      let parentUserId = null;
      if (parent_ref_code) {
        const parentUser = await storage.getUserByRefCode(parent_ref_code);
        if (parentUser) {
          parentUserId = parentUser.id;
          logger.info(`[AuthService] Найден родительский пользователь: ${parentUserId}`);
        } else {
          logger.warn(`[AuthService] Родительский реферальный код не найден: ${parent_ref_code}`);
        }
      }

      // Создаем пользователя
      const newUserData = {
        telegram_id,
        username: username || `user_${telegram_id}`,
        first_name,
        last_name,
        ref_code: refCode,
        parent_ref_code: parent_ref_code || null,
        balance_uni: '0',
        balance_ton: '0',
        created_at: new Date(),
        updated_at: new Date()
      };

      const newUser = await storage.createUser(newUserData);
      logger.info(`[AuthService] ✅ Новый пользователь создан: id=${newUser.id}, ref_code=${refCode}`);

      return newUser;
    } catch (error) {
      logger.error('[AuthService] Ошибка аутентификации через Telegram:', error);
      throw error;
    }
  }

  /**
   * Получение пользователя по telegram_id
   */
  async getUserByTelegramId(telegramId: number): Promise<any> {
    try {
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        throw new NotFoundError('Пользователь не найден');
      }
      return user;
    } catch (error) {
      logger.error(`[AuthService] Ошибка получения пользователя by telegram_id ${telegramId}:`, error);
      throw error;
    }
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId: number): Promise<any> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        throw new NotFoundError('Пользователь не найден');
      }
      return user;
    } catch (error) {
      logger.error(`[AuthService] Ошибка получения пользователя by id ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Аутентификация пользователя через guest_id
   */
  async authenticateGuestUser(guestData: {
    guest_id: string;
    username: string;
    first_name: string;
    last_name: string;
    parent_ref_code?: string;
  }): Promise<any> {
    try {
      const { guest_id, username, first_name, last_name, parent_ref_code } = guestData;

      logger.info(`[AuthService] Аутентификация пользователя guest_id: ${guest_id}`);

      // Ищем существующего пользователя
      let user = await storage.getUserByGuestId(guest_id);

      if (user) {
        logger.info(`[AuthService] Существующий guest пользователь найден: id=${user.id}`);
        return user;
      }

      // Создаем нового пользователя
      logger.info(`[AuthService] Создание нового guest пользователя`);

      // Генерируем уникальный реферальный код
      const refCode = await generateRefCode();

      // Создаем пользователя
      const newUserData = {
        guest_id,
        username,
        first_name,
        last_name,
        ref_code: refCode,
        parent_ref_code: parent_ref_code || null,
        balance_uni: '0',
        balance_ton: '0',
        created_at: new Date(),
        updated_at: new Date()
      };

      const newUser = await storage.createUser(newUserData);
      logger.info(`[AuthService] ✅ Новый guest пользователь создан: id=${newUser.id}, ref_code=${refCode}`);

      return newUser;
    } catch (error) {
      logger.error('[AuthService] Ошибка аутентификации через guest_id:', error);
      throw error;
    }
  }

  /**
   * Получает пользователя по guest_id
   */
  async getUserByGuestId(guestId: string): Promise<User | null> {
    try {
      console.log('[AuthService] Поиск пользователя по guest_id:', guestId);

      const result = await db.execute(
        `SELECT * FROM users WHERE guest_id = $1 LIMIT 1`,
        [guestId]
      );

      if (result.rows.length === 0) {
        console.log('[AuthService] Пользователь с guest_id не найден:', guestId);
        return null;
      }

      const user = result.rows[0] as User;
      console.log('[AuthService] Пользователь найден по guest_id:', user.id);
      return user;
    } catch (error) {
      console.error('[AuthService] Ошибка при поиске пользователя по guest_id:', error);
      throw error;
    }
  }

  /**
   * Получает пользователя по telegram_id
   */
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      console.log('[AuthService] Поиск пользователя по telegram_id:', telegramId);

      const result = await db.execute(
        `SELECT * FROM users WHERE telegram_id = $1 LIMIT 1`,
        [telegramId]
      );

      if (result.rows.length === 0) {
        console.log('[AuthService] Пользователь с telegram_id не найден:', telegramId);
        return null;
      }

      const user = result.rows[0] as User;
      console.log('[AuthService] Пользователь найден по telegram_id:', user.id);
      return user;
    } catch (error) {
      console.error('[AuthService] Ошибка при поиске пользователя по telegram_id:', error);
      throw error;
    }
  }
}

// Экспортируем экземпляр сервиса
export const authServiceInstance = new AuthServiceInstance();

/**
 * Фабричная функция для создания экземпляра сервиса аутентификации
 */
export function createAuthService(): AuthServiceInstance {
  return authServiceInstance;
}

/**
 * Интерфейс сервиса аутентификации
 */
export interface IAuthService {
  validateTelegramInitData(initData: string): Promise<boolean>;
  authenticateTelegramUser(userData: {
    telegram_id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    parent_ref_code?: string;
  }): Promise<any>;
  getUserByTelegramId(telegramId: number): Promise<any>;
  getUserById(userId: number): Promise<any>;
  authenticateGuestUser(guestData: {
    guest_id: string;
    username: string;
    first_name: string;
    last_name: string;
    parent_ref_code?: string;
  }): Promise<any>;
}