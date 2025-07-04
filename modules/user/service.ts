import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_code: string;
  referred_by?: string;
  guest_id?: string;
  balance_uni: string;
  balance_ton: string;
  created_at: string;
  updated_at?: string;
  // Farming fields
  uni_farming_start_timestamp?: string;
  uni_farming_last_update?: string;
  uni_deposit_amount?: string;
  uni_farming_rate?: string;
  uni_farming_balance?: string;
  uni_farming_active?: boolean;
}

export interface CreateUserData {
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_by?: string;
}

export interface UpdateUserData {
  username?: string;
  first_name?: string;
  ref_code?: string;
  balance_uni?: string;
  balance_ton?: string;
}

export class SupabaseUserRepository {
  constructor() {
    logger.info('[SupabaseUserRepository] Initialized with Supabase API');
  }

  /**
   * Генерирует уникальный реферальный код
   */
  generateRefCode(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `REF_${timestamp}_${randomStr}`;
  }

  /**
   * Создает нового пользователя
   */
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      const refCode = this.generateRefCode();
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.telegram_id,
          username: userData.username || userData.first_name || `user_${userData.telegram_id}`,
          first_name: userData.first_name || 'User',
          ref_code: refCode,
          referred_by: userData.ref_by || null,
          balance_uni: '0',
          balance_ton: '0'
        })
        .select()
        .single();

      if (error) {
        logger.error('[SupabaseUserRepository] Error creating user', { error: error.message, userData });
        return null;
      }

      logger.info('[SupabaseUserRepository] User created successfully', { userId: data.id, telegram_id: userData.telegram_id });
      return data;
    } catch (error) {
      logger.error('[SupabaseUserRepository] Error creating user', { error, userData });
      return null;
    }
  }

  /**
   * Находит пользователя по telegram_id
   */
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[SupabaseUserRepository] Error finding user by telegram_id', { error: error.message, telegramId });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[SupabaseUserRepository] Error finding user by telegram_id', { error, telegramId });
      return null;
    }
  }

  /**
   * Находит пользователя по ID
   */
  async getUserById(userId: number): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[SupabaseUserRepository] Error finding user by id', { error: error.message, userId });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[SupabaseUserRepository] Error finding user by id', { error, userId });
      return null;
    }
  }

  /**
   * Находит пользователя по реферальному коду
   */
  async findUserByRefCode(refCode: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ref_code', refCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('[SupabaseUserRepository] Error finding user by ref_code', { error: error.message, refCode });
        return null;
      }

      return data;
    } catch (error) {
      logger.error('[SupabaseUserRepository] Error finding user by ref_code', { error, refCode });
      return null;
    }
  }

  /**
   * Получает или создает пользователя из Telegram данных
   */
  async getOrCreateUserFromTelegram(userData: CreateUserData): Promise<User | null> {
    let user = await this.getUserByTelegramId(userData.telegram_id);
    
    if (!user) {
      user = await this.createUser(userData);
    }
    
    return user;
  }

  /**
   * Обновляет данные пользователя
   */
  async updateUser(userId: number, updateData: UpdateUserData): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error('[SupabaseUserRepository] Error updating user', { error: error.message, userId, updateData });
        return null;
      }

      logger.info('[SupabaseUserRepository] User updated successfully', { userId });
      return data;
    } catch (error) {
      logger.error('[SupabaseUserRepository] Error updating user', { error, userId, updateData });
      return null;
    }
  }

  /**
   * Обновляет реферальный код пользователя
   */
  async updateUserRefCode(userId: number, newRefCode?: string): Promise<User | null> {
    const refCode = newRefCode || this.generateRefCode();
    return this.updateUser(userId, { ref_code: refCode });
  }

  /**
   * Поиск пользователя по telegram_id (alias для совместимости)
   */
  async findUserByTelegramId(telegramId: number): Promise<User | null> {
    return this.getUserByTelegramId(telegramId);
  }

  /**
   * Находит пользователя по guest_id
   */
  async getUserByGuestId(guestId: string): Promise<User | null> {
    try {
      logger.info('[getUserByGuestId] Поиск пользователя по guest_id:', guestId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('guest_id', guestId)
        .single();

      if (error) {
        logger.warn('[getUserByGuestId] Пользователь не найден:', error.message);
        return null;
      }

      logger.info('[getUserByGuestId] Пользователь найден:', {
        id: data.id,
        telegram_id: data.telegram_id,
        guest_id: data.guest_id
      });

      return data;
    } catch (error) {
      logger.error('[getUserByGuestId] Ошибка поиска пользователя:', error);
      return null;
    }
  }
}

export default SupabaseUserRepository;