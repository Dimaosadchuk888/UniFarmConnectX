import { supabase } from '../../core/supabase';
// Типы пользователя для Supabase API
interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_code: string;
  referred_by?: string;
  balance_uni: string;
  balance_ton: string;
  uni_deposit_amount?: string;
  uni_farming_start_timestamp?: string;
  uni_farming_last_update?: string;
  uni_farming_rate?: string;
  checkin_last_date?: string;
  checkin_streak?: number;
  created_at: string;
}

interface InsertUser {
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_code: string;
  referred_by?: string;
  balance_uni?: string;
  balance_ton?: string;
  parent_ref_code?: string;
}
import { customAlphabet } from 'nanoid';
import { logger } from '../../core/logger.js';

export interface CreateUserFromTelegramParams {
  telegram_id: number;
  username?: string;
  first_name?: string;
  ref_by?: string; // реферальный код пригласителя
}

export class UserRepository {
  private generateRefCode = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

  /**
   * Находит пользователя по telegram_id
   */
  async findByTelegramId(telegramId: number): Promise<User | null> {
    try {
      logger.info('[UserRepository] Searching user by telegram_id', { telegramId });
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .limit(1);

      if (error) {
        logger.error('[UserRepository] Supabase error finding user', { error: error.message });
        return null;
      }

      const user = users?.[0] || null;
      if (user) {
        logger.info('[UserRepository] User found', { userId: user.id });
      } else {
        logger.info('[UserRepository] User not found for telegram_id', { telegramId });
      }

      return user;
    } catch (error) {
      logger.error('[UserRepository] Error finding user by telegram_id', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Находит пользователя по реферальному коду
   */
  async findByRefCode(refCode: string): Promise<User | null> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('ref_code', refCode)
        .limit(1);

      if (error) {
        logger.error('[UserRepository] Supabase error finding user by ref_code', { error: error.message });
        return null;
      }

      return users?.[0] || null;
    } catch (error) {
      logger.error('[UserRepository] Error finding user by ref_code', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Создает нового пользователя из данных Telegram
   */
  async createUserFromTelegram(params: CreateUserFromTelegramParams): Promise<User> {
    try {
      logger.info('[UserRepository] Creating new user from Telegram data', { params });
      console.log('✅ UserRepository: Starting user creation for telegram_id:', params.telegram_id);

      // Генерируем уникальный реферальный код
      let refCode: string;
      let isUnique = false;
      let attempts = 0;
      
      do {
        refCode = this.generateRefCode();
        const existing = await this.findByRefCode(refCode);
        isUnique = !existing;
        attempts++;
        
        if (attempts > 10) {
          throw new Error('Failed to generate unique ref_code after 10 attempts');
        }
      } while (!isUnique);
      
      console.log('✅ Generated unique ref_code:', refCode);

      // Определяем parent_ref_code (кто пригласил)
      let parentRefCode: string | undefined = undefined;
      if (params.ref_by) {
        const inviter = await this.findByRefCode(params.ref_by);
        if (inviter) {
          parentRefCode = params.ref_by;
          logger.info('[UserRepository] Found inviter', { inviterId: inviter.id });
          console.log('✅ Found inviter user for ref_code:', params.ref_by);
        } else {
          logger.warn('[UserRepository] Invalid ref_by code provided', { refBy: params.ref_by });
          console.log('⚠️ Invalid ref_by code:', params.ref_by);
        }
      }

      // Создаем пользователя
      const userData: InsertUser = {
        telegram_id: params.telegram_id,
        username: params.username || params.first_name || `user_${params.telegram_id}`,
        ref_code: refCode,
        referred_by: parentRefCode
      };

      console.log('✅ Inserting user data into database:', userData);
      
      // Создаем пользователя через Supabase API
      const { data: newUsers, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase error creating user:', error.message);
        throw new Error(`Failed to create user: ${error.message}`);
      }

      const newUser = newUsers as User;
      logger.info('[UserRepository] Successfully created user', { userId: newUser.id });
      console.log('✅ User successfully created in database:', { 
        id: newUser.id, 
        telegram_id: newUser.telegram_id, 
        ref_code: newUser.ref_code 
      });
      
      return newUser;
    } catch (error) {
      logger.error('[UserRepository] Error creating user from Telegram', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Обновляет данные пользователя
   */
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[UserRepository] Supabase error updating user:', error.message);
        return null;
      }

      return data as User;
    } catch (error) {
      console.error('[UserRepository] Error updating user:', error);
      return null;
    }
  }

  /**
   * Проверяет уникальность telegram_id и username
   */
  async checkUniqueness(telegramId: number, username?: string): Promise<{
    telegramIdExists: boolean;
    usernameExists: boolean;
  }> {
    try {
      const { data: telegramIdCheck, error: telegramIdError } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .limit(1);

      if (telegramIdError) {
        console.error('[UserRepository] Error checking telegram_id uniqueness:', telegramIdError.message);
      }

      let usernameCheck: any[] = [];
      if (username) {
        const { data: usernameData, error: usernameError } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .limit(1);

        if (usernameError) {
          console.error('[UserRepository] Error checking username uniqueness:', usernameError.message);
        } else {
          usernameCheck = usernameData || [];
        }
      }

      return {
        telegramIdExists: (telegramIdCheck || []).length > 0,
        usernameExists: usernameCheck.length > 0
      };
    } catch (error) {
      console.error('[UserRepository] Error checking uniqueness:', error);
      return {
        telegramIdExists: false,
        usernameExists: false
      };
    }
  }
}