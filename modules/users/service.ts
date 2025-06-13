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
      console.log('[UserService] Finding or creating user for telegram_id:', params.telegram_id);

      // Сначала пытаемся найти существующего пользователя
      let user = await this.userRepository.findByTelegramId(params.telegram_id);

      if (!user) {
        // Пользователь не найден, создаем нового
        console.log('[UserService] User not found, creating new user');
        user = await this.userRepository.createUserFromTelegram(params);
      } else {
        console.log('[UserService] Found existing user:', user.id);
      }

      return this.mapToUserInfo(user);
    } catch (error) {
      console.error('[UserService] Error in findOrCreateFromTelegram:', error);
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
      console.error('[UserService] Error finding user by telegram_id:', error);
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
      console.error('[UserService] Error finding user by ref_code:', error);
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
      console.error('[UserService] Error checking if user exists:', error);
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
      console.error('[UserService] Error validating ref_code:', error);
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