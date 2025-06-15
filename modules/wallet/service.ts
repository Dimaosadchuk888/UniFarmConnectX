import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger.js';

export class WalletService {
  async getWalletDataByTelegramId(telegramId: string): Promise<{
    uni_balance: number;
    ton_balance: number;
    total_earned: number;
    total_spent: number;
    transactions: any[];
  }> {
    try {
      // Находим пользователя по telegram_id
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (userError || !user) {
        return {
          uni_balance: 0,
          ton_balance: 0,
          total_earned: 0,
          total_spent: 0,
          transactions: []
        };
      }

      // Используем баланс из пользователя, так как таблица transactions может быть пустой
      return {
        uni_balance: parseFloat(user.balance_uni || "0"),
        ton_balance: parseFloat(user.balance_ton || "0"),
        total_earned: parseFloat(user.uni_farming_balance || "0"), // Из farming баланса
        total_spent: 0,
        transactions: [] // Пока пустой массив, пока не настроена схема transactions
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка получения данных кошелька', { 
        telegramId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async addUniFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      // Получаем пользователя
      const { data: user, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден', { userId, error: getUserError?.message });
        return false;
      }

      // Обновляем баланс UNI
      const currentBalance = parseFloat(user.balance_uni || "0");
      const newBalance = currentBalance + parseFloat(amount);

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          balance_uni: newBalance.toString(),
          checkin_last_date: new Date().toISOString() 
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('[WalletService] Ошибка обновления баланса UNI', { 
          userId, 
          error: updateError.message 
        });
        return false;
      }

      logger.info('[WalletService] UNI баланс обновлен', { 
        userId, 
        amount, 
        newBalance 
      });
      return true;

    } catch (error) {
      logger.error('[WalletService] Ошибка добавления UNI дохода', { 
        userId, 
        amount, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  async addTonFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      // Получаем пользователя
      const { data: user, error: getUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден', { userId, error: getUserError?.message });
        return false;
      }

      // Обновляем баланс TON
      const currentBalance = parseFloat(user.balance_ton || "0");
      const newBalance = currentBalance + parseFloat(amount);

      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          balance_ton: newBalance.toString(),
          checkin_last_date: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('[WalletService] Ошибка обновления баланса TON', { 
          userId, 
          error: updateError.message 
        });
        return false;
      }

      logger.info('[WalletService] TON баланс обновлен', { 
        userId, 
        amount, 
        newBalance 
      });
      return true;

    } catch (error) {
      logger.error('[WalletService] Ошибка добавления TON дохода', { 
        userId, 
        amount, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  async getBalance(userId: string): Promise<{ uni: number; ton: number }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('balance_uni, balance_ton')
        .eq('id', userId)
        .single();

      if (error || !user) {
        logger.error('[WalletService] Пользователь не найден', { userId, error: error?.message });
        return { uni: 0, ton: 0 };
      }

      return {
        uni: parseFloat(user.balance_uni || "0"),
        ton: parseFloat(user.balance_ton || "0")
      };

    } catch (error) {
      logger.error('[WalletService] Ошибка получения баланса', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { uni: 0, ton: 0 };
    }
  }

  async getTransactionHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // Пока возвращаем пустой массив, так как структура transactions не определена
      return [];
    } catch (error) {
      logger.error('[WalletService] Ошибка получения истории транзакций', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }
}