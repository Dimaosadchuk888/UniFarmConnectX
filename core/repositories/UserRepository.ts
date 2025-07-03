import { supabase } from '../supabase';
import type { User } from '../../shared/schema.js';

/**
 * Централизованный репозиторий для работы с пользователями через Supabase API
 * Заменяет все Drizzle ORM запросы на Supabase API вызовы
 */
export class UserRepository {
  /**
   * Найти пользователя по Telegram ID
   */
  static async findByTelegramId(telegramId: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', Number(telegramId))
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = не найдено
        throw error;
      }
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по Telegram ID:', error);
      throw error;
    }
  }

  /**
   * Найти пользователя по ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', parseInt(id))
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по ID:', error);
      throw error;
    }
  }

  /**
   * Найти пользователя по Guest ID
   */
  static async findByGuestId(guestId: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('guest_id', guestId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return user || null;
    } catch (error) {
      console.error('[UserRepository] Ошибка поиска по Guest ID:', error);
      throw error;
    }
  }

  /**
   * Создать нового пользователя
   */
  static async create(userData: any): Promise<User> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return user;
    } catch (error) {
      console.error('[UserRepository] Ошибка создания пользователя:', error);
      throw error;
    }
  }

  /**
   * Обновить баланс пользователя
   */
  /**
   * ЦЕНТРАЛИЗОВАННОЕ обновление баланса через BalanceManager
   * УСТРАНЕНО ДУБЛИРОВАНИЕ: делегирует на BalanceManager
   */
  static async updateBalance(userId: string, balanceUni: string, balanceTon: string): Promise<boolean> {
    try {
      const { balanceManager } = await import('../BalanceManager');
      
      const result = await balanceManager.setBalance(
        parseInt(userId),
        parseFloat(balanceUni),
        parseFloat(balanceTon),
        'UserRepository'
      );
      
      if (!result.success) {
        console.error('[UserRepository] Ошибка обновления баланса через BalanceManager:', result.error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[UserRepository] Ошибка делегирования обновления баланса:', error);
      return false;
    }
  }

  /**
   * Обновить данные пользователя
   */
  static async update(userId: string, updateData: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', parseInt(userId));
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('[UserRepository] Ошибка обновления пользователя:', error);
      return false;
    }
  }
}