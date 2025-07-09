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

  async getWalletDataByUserId(userId: string): Promise<{
    uni_balance: number;
    ton_balance: number;
    total_earned: number;
    total_spent: number;
    transactions: any[];
  }> {
    try {
      // Находим пользователя по id
      const { data: user, error: userError } = await supabase
        .from(WALLET_TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        logger.warn('[WalletService] Пользователь не найден по ID', { userId });
        return {
          uni_balance: 0,
          ton_balance: 0,
          total_earned: 0,
          total_spent: 0,
          transactions: []
        };
      }

      // Используем баланс из пользователя
      return {
        uni_balance: parseFloat(user.balance_uni || "0"),
        ton_balance: parseFloat(user.balance_ton || "0"),
        total_earned: parseFloat(user.uni_farming_balance || "0"),
        total_spent: 0,
        transactions: []
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка получения данных кошелька по ID', { 
        userId, 
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

      // Обновляем баланс UNI через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        userId,
        parseFloat(amount),
        0,
        'WalletService.updateUniBalance'
      );

      if (!result.success) {
        logger.error('[WalletService] Ошибка обновления баланса UNI', { 
          userId, 
          error: result.error 
        });
        return false;
      }

      // Обновляем дату последней активности отдельно
      await supabase
        .from(WALLET_TABLES.USERS)
        .update({ checkin_last_date: new Date().toISOString() })
        .eq('id', userId);

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

      // Обновляем баланс TON через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const result = await balanceManager.addBalance(
        userId,
        0,
        parseFloat(amount),
        'WalletService.updateTonBalance'
      );

      if (!result.success) {
        logger.error('[WalletService] Ошибка обновления баланса TON', { 
          userId, 
          error: result.error 
        });
        return false;
      }

      // Обновляем дату последней активности отдельно
      await supabase
        .from(WALLET_TABLES.USERS)
        .update({ checkin_last_date: new Date().toISOString() })
        .eq('id', userId);

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

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      // Получаем транзакции из базы данных
      const { data: transactions, error, count } = await supabase
        .from(WALLET_TABLES.TRANSACTIONS)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('[WalletService] Ошибка получения транзакций', { 
          userId, 
          error: error.message 
        });
        return { transactions: [], total: 0, hasMore: false };
      }

      const formattedTransactions = (transactions || []).map(tx => {
        // Определяем валюту более точно
        const hasUniAmount = parseFloat(tx.amount_uni || '0') > 0;
        const hasTonAmount = parseFloat(tx.amount_ton || '0') > 0;
        
        // Если есть явное поле currency, используем его
        // Иначе определяем по наличию суммы
        let currency = tx.currency;
        if (!currency) {
          currency = hasUniAmount ? 'UNI' : (hasTonAmount ? 'TON' : 'UNI');
        }
        
        return {
          id: tx.id,
          type: tx.type,
          amount: currency === 'UNI' ? (tx.amount_uni || '0') : (tx.amount_ton || '0'),
          currency: currency,
          status: tx.status || 'completed',
          description: tx.description || '',
          createdAt: tx.created_at,
          timestamp: new Date(tx.created_at).getTime()
        };
      });

      return {
        transactions: formattedTransactions,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка получения истории транзакций', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { transactions: [], total: 0, hasMore: false };
    }
  }

  async processWithdrawal(userId: string, amount: string, type: 'UNI' | 'TON', walletAddress?: string): Promise<boolean | { success: false; error: string }> {
    try {
      // Получаем пользователя
      const { data: user, error: getUserError } = await supabase
        .from(WALLET_TABLES.USERS)
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError || !user) {
        logger.error('[WalletService] Пользователь не найден для вывода', { userId, error: getUserError?.message });
        return { success: false, error: 'Пользователь не найден' };
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

      // Проверка минимальной суммы для TON
      if (type === 'TON' && withdrawAmount < 1) {
        logger.warn('[WalletService] Сумма вывода TON меньше минимальной', { 
          userId, 
          requested: withdrawAmount, 
          minimum: 1
        });
        return { success: false, error: 'Минимальная сумма вывода — 1 TON' };
      }

      // Проверяем достаточность средств
      if (currentBalance < withdrawAmount) {
        logger.warn('[WalletService] Недостаточно средств для вывода', { 
          userId, 
          requested: withdrawAmount, 
          available: currentBalance,
          type 
        });
        return { success: false, error: `Недостаточно средств. Доступно: ${currentBalance} ${type}` };
      }

      // Сначала создаем заявку на вывод (только для TON, так как UNI не выводится)
      if (type === 'TON') {
        const { data: withdrawRequest, error: withdrawError } = await supabase
          .from('withdraw_requests')
          .insert({
            user_id: parseInt(userId),
            telegram_id: user.telegram_id?.toString() || '',
            username: user.username || '',
            amount_ton: withdrawAmount,
            ton_wallet: walletAddress || '',
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (withdrawError) {
          logger.error('[WalletService] Ошибка создания заявки на вывод', { 
            userId, 
            error: withdrawError.message 
          });
          return { success: false, error: 'Ошибка создания заявки на вывод' };
        }
      }



      // Обновляем баланс через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const amount_uni = type === 'UNI' ? withdrawAmount : 0;
      const amount_ton = type === 'TON' ? withdrawAmount : 0;
      
      const result = await balanceManager.subtractBalance(
        userId,
        amount_uni,
        amount_ton,
        'WalletService.withdraw'
      );

      if (!result.success) {
        // Если не удалось списать баланс, отменяем заявку (только для TON)
        if (type === 'TON') {
          await supabase
            .from('withdraw_requests')
            .update({ status: 'rejected' })
            .eq('user_id', parseInt(userId))
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);
        }
          
        logger.error('[WalletService] Ошибка обновления баланса при выводе', { 
          userId, 
          error: result.error 
        });
        return { success: false, error: result.error || 'Ошибка обновления баланса' };
      }

      // Создаем запись транзакции
      const { error: transactionError } = await supabase
        .from(WALLET_TABLES.TRANSACTIONS)
        .insert({
          user_id: parseInt(userId),
          type: 'withdrawal',
          amount_uni: type === 'UNI' ? withdrawAmount.toString() : '0',
          amount_ton: type === 'TON' ? withdrawAmount.toString() : '0',
          currency: type,
          status: 'pending', // Изменено с 'completed' на 'pending'
          description: `Вывод ${withdrawAmount} ${type}`,
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        logger.warn('[WalletService] Ошибка создания транзакции (баланс обновлен)', { 
          userId, 
          error: transactionError.message 
        });
      }

      logger.info('[WalletService] Вывод средств обработан успешно', { 
        userId, 
        amount: withdrawAmount, 
        type,
        isWithdrawRequest: type === 'TON',
        newBalance: result.newBalance 
      });
      
      return true;

    } catch (error) {
      logger.error('[WalletService] Ошибка обработки вывода средств', { 
        userId, 
        amount, 
        type,
        error: error instanceof Error ? error.message : String(error) 
      });
      return { success: false, error: 'Внутренняя ошибка сервера при обработке вывода' };
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

  /**
   * Метод для списания средств с баланса пользователя
   * Используется при покупке Boost-пакетов через внутренний баланс
   * @param userId - ID пользователя
   * @param amount - Сумма для списания
   * @param currency - Валюта (UNI или TON)
   * @returns Результат операции
   */
  async withdrawFunds(userId: string, amount: number, currency: 'UNI' | 'TON'): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('[WalletService] withdrawFunds вызван', { userId, amount, currency });

      // Проверяем наличие средств
      const balance = await this.getBalance(userId);
      const currentBalance = currency === 'TON' ? balance.ton : balance.uni;

      if (currentBalance < amount) {
        logger.warn('[WalletService] Недостаточно средств для списания', {
          userId,
          requested: amount,
          available: currentBalance,
          currency
        });
        return { 
          success: false, 
          error: `Недостаточно средств. Доступно: ${currentBalance} ${currency}` 
        };
      }

      // Используем существующий метод processWithdrawal
      const result = await this.processWithdrawal(userId, amount.toString(), currency);

      if (result) {
        logger.info('[WalletService] Средства успешно списаны', { userId, amount, currency });
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Ошибка при списании средств' 
        };
      }

    } catch (error) {
      logger.error('[WalletService] Ошибка в withdrawFunds', {
        userId,
        amount,
        currency,
        error: error instanceof Error ? error.message : String(error)
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      };
    }
  }

  async transferFunds(params: {
    from_user_id: number;
    to_user_id: number;
    amount: number;
    currency: 'UNI' | 'TON';
  }): Promise<{ success: boolean; error?: string; transaction_id?: string; from_balance?: number; to_balance?: number }> {
    try {
      const { from_user_id, to_user_id, amount, currency } = params;

      // Проверяем баланс отправителя
      const fromBalance = await this.getBalance(from_user_id.toString());
      const currentBalance = currency === 'UNI' ? fromBalance.uni : fromBalance.ton;

      if (currentBalance < amount) {
        return {
          success: false,
          error: `Недостаточно средств. Доступно: ${currentBalance} ${currency}`
        };
      }

      // Используем BalanceManager для атомарного перевода
      const { balanceManager } = await import('../../core/BalanceManager');
      
      // Списываем с отправителя
      const withdrawResult = await balanceManager.subtractBalance(
        from_user_id,
        currency === 'UNI' ? amount : 0,
        currency === 'TON' ? amount : 0,
        'Internal transfer'
      );

      if (!withdrawResult.success) {
        return {
          success: false,
          error: withdrawResult.error || 'Ошибка списания средств'
        };
      }

      // Начисляем получателю
      const depositResult = await balanceManager.addBalance(
        to_user_id,
        currency === 'UNI' ? amount : 0,
        currency === 'TON' ? amount : 0,
        'Internal transfer'
      );

      if (!depositResult.success) {
        // Откатываем транзакцию - возвращаем средства отправителю
        await balanceManager.addBalance(
          from_user_id,
          currency === 'UNI' ? amount : 0,
          currency === 'TON' ? amount : 0,
          'Transfer rollback'
        );
        
        return {
          success: false,
          error: depositResult.error || 'Ошибка зачисления средств'
        };
      }

      // Создаем записи транзакций
      const transactionId = `TRANSFER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Транзакция списания
      await supabase.from(WALLET_TABLES.TRANSACTIONS).insert({
        user_id: from_user_id,
        type: 'TRANSFER_OUT',
        amount_uni: currency === 'UNI' ? amount.toString() : '0',
        amount_ton: currency === 'TON' ? amount.toString() : '0',
        description: `Перевод ${amount} ${currency} пользователю ID ${to_user_id}`,
        created_at: new Date().toISOString()
      });

      // Транзакция зачисления
      await supabase.from(WALLET_TABLES.TRANSACTIONS).insert({
        user_id: to_user_id,
        type: 'TRANSFER_IN',
        amount_uni: currency === 'UNI' ? amount.toString() : '0',
        amount_ton: currency === 'TON' ? amount.toString() : '0',
        description: `Получен перевод ${amount} ${currency} от пользователя ID ${from_user_id}`,
        created_at: new Date().toISOString()
      });

      logger.info('[WalletService] Перевод выполнен успешно', {
        transaction_id: transactionId,
        from_user_id,
        to_user_id,
        amount,
        currency
      });

      return {
        success: true,
        transaction_id: transactionId,
        from_balance: withdrawResult.newBalance ? 
          (currency === 'UNI' ? withdrawResult.newBalance.balance_uni : withdrawResult.newBalance.balance_ton) : 0,
        to_balance: depositResult.newBalance ? 
          (currency === 'UNI' ? depositResult.newBalance.balance_uni : depositResult.newBalance.balance_ton) : 0
      };

    } catch (error) {
      logger.error('[WalletService] Ошибка перевода средств', {
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: 'Внутренняя ошибка при переводе'
      };
    }
  }
}