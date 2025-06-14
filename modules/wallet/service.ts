import { supabase } from '../../core/supabaseClient';
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

      // Получаем последние транзакции пользователя
      const { data: userTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        uni_balance: parseFloat(user.balance_uni || "0"),
        ton_balance: parseFloat(user.balance_ton || "0"),
        total_earned: 0, // Можно вычислить из транзакций
        total_spent: 0,  // Можно вычислить из транзакций
        transactions: (userTransactions || []).map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          amount_uni: parseFloat(tx.amount_uni || "0"),
          amount_ton: parseFloat(tx.amount_ton || "0"),
          description: tx.description || '',
          date: tx.created_at
        }))
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка получения данных кошелька', { telegramId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async addUniFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      // Получаем текущий баланс пользователя
      const { data: user, error: getUserError } = await supabase
        .from('users')
        .select('balance_uni')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден для добавления UNI дохода', { userId });
        return false;
      }

      const currentBalance = parseFloat(user.balance_uni || '0');
      const newBalance = currentBalance + parseFloat(amount);

      // Обновляем баланс
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance_uni: newBalance.toFixed(6) })
        .eq('id', userId);

      if (updateError) {
        logger.error('[WalletService] Ошибка обновления UNI баланса', { userId, updateError: updateError.message });
        return false;
      }

      // Создаем запись о транзакции
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: parseInt(userId),
          type: 'FARMING_REWARD',
          amount_uni: parseFloat(amount),
          amount_ton: 0,
          description: 'UNI Farming Income',
          created_at: new Date().toISOString()
        }]);

      if (txError) {
        logger.warn('[WalletService] Ошибка создания транзакции UNI farming', { userId, txError: txError.message });
      }

      logger.info('[WalletService] UNI доход успешно добавлен', { userId, amount, newBalance });
      return true;
    } catch (error) {
      logger.error('[WalletService] Ошибка добавления UNI дохода', { userId, amount, error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async addTonFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      // Получаем текущий баланс пользователя
      const { data: user, error: getUserError } = await supabase
        .from('users')
        .select('balance_ton')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден для добавления TON дохода', { userId });
        return false;
      }

      const currentBalance = parseFloat(user.balance_ton || '0');
      const newBalance = currentBalance + parseFloat(amount);

      // Обновляем баланс
      const { error: updateError } = await supabase
        .from('users')
        .update({ balance_ton: newBalance.toFixed(6) })
        .eq('id', userId);

      if (updateError) {
        logger.error('[WalletService] Ошибка обновления TON баланса', { userId, updateError: updateError.message });
        return false;
      }

      // Создаем запись о транзакции
      const { error: txError } = await supabase
        .from('transactions')
        .insert([{
          user_id: parseInt(userId),
          type: 'FARMING_REWARD',
          amount_uni: 0,
          amount_ton: parseFloat(amount),
          description: 'TON Farming Income',
          created_at: new Date().toISOString()
        }]);

      if (txError) {
        logger.warn('[WalletService] Ошибка создания транзакции TON farming', { userId, txError: txError.message });
      }

      logger.info('[WalletService] TON доход успешно добавлен', { userId, amount, newBalance });
      return true;
    } catch (error) {
      logger.error('[WalletService] Ошибка добавления TON дохода', { userId, amount, error: error instanceof Error ? error.message : String(error) });
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
        return { uni: 0, ton: 0 };
      }

      return {
        uni: parseFloat(user.balance_uni || '0'),
        ton: parseFloat(user.balance_ton || '0')
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка получения баланса', { userId, error: error instanceof Error ? error.message : String(error) });
      return { uni: 0, ton: 0 };
    }
  }

  async getTransactionHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('[WalletService] Ошибка получения истории транзакций', { userId, error: error.message });
        return [];
      }

      return transactions || [];
    } catch (error) {
      logger.error('[WalletService] Ошибка получения истории транзакций', { userId, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}