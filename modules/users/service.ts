import { UserRepository, type CreateUserFromTelegramParams } from './repository';
import type { User } from '../../shared/schema';
import { logger } from '../../core/logger';

export interface UserInfo {
  id: number;
  telegram_id: number | null;
  username: string;
  ref_code: string;
  parent_ref_code: string | null;
  balance_uni: string;
  balance_ton: string;
  created_at: Date;
}

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Находит или создает пользователя по данным Telegram
   */
  async findOrCreateFromTelegram(params: CreateUserFromTelegramParams): Promise<UserInfo> {
    try {
      logger.info('[UserService] Finding or creating user for telegram_id', { telegram_id: params.telegram_id });
      console.log('✅ UserService called with params:', { telegram_id: params.telegram_id, username: params.username });

      // Сначала пытаемся найти существующего пользователя
      let user = await this.userRepository.findByTelegramId(params.telegram_id);

      if (!user) {
        // Пользователь не найден, создаем нового
        logger.info('[UserService] User not found, creating new user');
        console.log('✅ Creating new user in database...');
        user = await this.userRepository.createUserFromTelegram(params);
        console.log('✅ User created successfully:', { id: user.id, telegram_id: user.telegram_id, ref_code: user.ref_code });
      } else {
        logger.info('[UserService] Found existing user', { userId: user.id });
        console.log('✅ Found existing user:', { id: user.id, telegram_id: user.telegram_id });
      }

      const userInfo = this.mapToUserInfo(user);
      console.log('✅ Returning UserInfo:', { id: userInfo.id, ref_code: userInfo.ref_code });
      return userInfo;
    } catch (error) {
      logger.error('[UserService] Error in findOrCreateFromTelegram', { error: error instanceof Error ? error.message : String(error) });
      console.log('❌ UserService error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Находит пользователя по telegram_id
   */
  async findByTelegramId(telegramId: number): Promise<UserInfo | null> {
    try {
      const user = await this.userRepository.findByTelegramId(telegramId);
      return user ? this.mapToUserInfo(user) : null;
    } catch (error) {
      logger.error('[UserService] Error finding user by telegram_id', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Находит пользователя по реферальному коду
   */
  async findByRefCode(refCode: string): Promise<UserInfo | null> {
    try {
      const user = await this.userRepository.findByRefCode(refCode);
      return user ? this.mapToUserInfo(user) : null;
    } catch (error) {
      logger.error('[UserService] Error finding user by ref_code', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Проверяет, существует ли пользователь с данным telegram_id
   */
  async userExists(telegramId: number): Promise<boolean> {
    try {
      const user = await this.userRepository.findByTelegramId(telegramId);
      return !!user;
    } catch (error) {
      logger.error('[UserService] Error checking if user exists', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Валидирует реферальный код
   */
  async validateRefCode(refCode: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByRefCode(refCode);
      return !!user;
    } catch (error) {
      logger.error('[UserService] Error validating ref_code', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Конвертирует объект User в UserInfo
   */
  private mapToUserInfo(user: User): UserInfo {
    return {
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username || '',
      ref_code: user.ref_code || '',
      parent_ref_code: user.parent_ref_code,
      balance_uni: user.balance_uni || '0',
      balance_ton: user.balance_ton || '0',
      created_at: user.created_at || new Date()
    };
  }
}