import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger.js';
import { WALLET_TABLES, WALLET_CONFIG } from './model';

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
        .from(WALLET_TABLES.USERS)
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
        .from(WALLET_TABLES.USERS)
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
        .from(WALLET_TABLES.USERS)
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
        .from(WALLET_TABLES.USERS)
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
        .from(WALLET_TABLES.USERS)
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
        .from(WALLET_TABLES.USERS)
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

  async processWithdrawal(userId: string, amount: string, type: 'UNI' | 'TON'): Promise<boolean> {
    try {
      // Получаем пользователя
      const { data: user, error: getUserError } = await supabase
        .from(WALLET_TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден для вывода', { userId, error: getUserError?.message });
        return false;
      }

      const withdrawAmount = parseFloat(amount);
      let currentBalance = 0;
      let balanceField = '';

      if (type === 'UNI') {
        currentBalance = parseFloat(user.balance_uni || "0");
        balanceField = 'balance_uni';
      } else if (type === 'TON') {
        currentBalance = parseFloat(user.balance_ton || "0");
        balanceField = 'balance_ton';
      }

      // Проверяем достаточность средств
      if (currentBalance < withdrawAmount) {
        logger.warn('[WalletService] Недостаточно средств для вывода', { 
          userId, 
          requested: withdrawAmount, 
          available: currentBalance,
          type 
        });
        return false;
      }

      // Обновляем баланс
      const newBalance = currentBalance - withdrawAmount;
      const updateData: any = {};
      updateData[balanceField] = newBalance.toString();

      const { error: updateError } = await supabase
        .from(WALLET_TABLES.USERS)
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        logger.error('[WalletService] Ошибка обновления баланса при выводе', { 
          userId, 
          error: updateError.message 
        });
        return false;
      }

      // Создаем запись транзакции
      const { error: transactionError } = await supabase
        .from(WALLET_TABLES.TRANSACTIONS)
        .insert({
          user_id: parseInt(userId),
          type: 'withdrawal',
          amount: withdrawAmount.toString(),
          currency: type,
          status: 'completed',
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        logger.warn('[WalletService] Ошибка создания транзакции (баланс обновлен)', { 
          userId, 
          error: transactionError.message 
        });
      }

      logger.info('[WalletService] Вывод средств выполнен успешно', { 
        userId, 
        amount: withdrawAmount, 
        type,
        newBalance 
      });
      
      return true;

    } catch (error) {
      logger.error('[WalletService] Ошибка обработки вывода средств', { 
        userId, 
        amount, 
        type,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  async createDeposit(params: {
    user_id: number;
    telegram_id: number;
    amount: number;
    currency: 'UNI' | 'TON';
    deposit_type: string;
    wallet_address?: string | null;
  }): Promise<{ transaction_id: string; success: boolean }> {
    try {
      const { user_id, telegram_id, amount, currency, deposit_type, wallet_address } = params;
      
      // Генерируем ID транзакции
      const transactionId = `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Для UNI депозитов - сразу начисляем на баланс (manual_deposit)
      if (currency === 'UNI' && deposit_type === 'manual_deposit') {
        await this.addUniFarmIncome(user_id.toString(), amount.toString());
      }

      // Создаем запись транзакции (упрощенная версия)
      try {
        const { data: transaction, error: transactionError } = await supabase
          .from(WALLET_TABLES.TRANSACTIONS)
          .insert({
            user_id: user_id,
            type: currency === 'UNI' ? 'UNI_DEPOSIT' : 'TON_DEPOSIT',
            amount_uni: currency === 'UNI' ? amount.toString() : '0',
            amount_ton: currency === 'TON' ? amount.toString() : '0',
            description: `Депозит ${amount} ${currency} (${deposit_type})`,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (transactionError) {
          logger.warn('[WalletService] Не удалось создать транзакцию, но депозит зачислен', { 
            user_id, 
            error: transactionError.message 
          });
        }
      } catch (transactionCreateError) {
        logger.warn('[WalletService] Ошибка создания транзакции, но основная операция выполнена', { 
          user_id,
          error: transactionCreateError instanceof Error ? transactionCreateError.message : String(transactionCreateError)
        });
      }

      logger.info('[WalletService] Депозит создан', {
        transaction_id: transactionId,
        user_id,
        telegram_id,
        amount,
        currency,
        deposit_type,
        wallet_address
      });

      return {
        transaction_id: transactionId,
        success: true
      };

    } catch (error) {
      logger.error('[WalletService] Ошибка создания депозита', {
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}