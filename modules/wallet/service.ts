import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger.js';
import { WALLET_TABLES, WALLET_CONFIG } from './model';

export class WalletService {
  async saveTonWallet(userId: number, walletAddress: string): Promise<any> {
    try {
      // Проверяем, не привязан ли адрес к другому аккаунту
      const { data: existingUser, error: checkError } = await supabase
        .from(WALLET_TABLES.USERS)
        .select('id, telegram_id')
        .eq('ton_wallet_address', walletAddress)
        .neq('id', userId)
        .single();
      
      if (existingUser) {
        throw new Error('Этот адрес кошелька уже привязан к другому аккаунту');
      }
      
      // Сохраняем адрес кошелька
      const { data: updatedUser, error: updateError } = await supabase
        .from(WALLET_TABLES.USERS)
        .update({
          ton_wallet_address: walletAddress,
          ton_wallet_verified: true,
          ton_wallet_linked_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        logger.error('[WalletService] Ошибка сохранения TON адреса', {
          userId,
          error: updateError.message
        });
        throw updateError;
      }
      
      // Логируем событие подключения кошелька
      await this.logWalletConnection(userId, walletAddress);
      
      return updatedUser;
    } catch (error) {
      logger.error('[WalletService] Ошибка подключения TON кошелька', {
        userId,
        walletAddress,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  private async logWalletConnection(userId: number, address: string): Promise<void> {
    try {
      await supabase
        .from(WALLET_TABLES.TRANSACTIONS)
        .insert({
          user_id: userId,
          type: 'WALLET_CONNECT',
          amount: 0,
          currency: 'TON',
          status: 'completed',
          description: `TON wallet connected: ${address}`,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      logger.warn('[WalletService] Не удалось записать событие подключения кошелька', {
        userId,
        address,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

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

  /**
   * Обрабатывает TON депозит
   */
  async processTonDeposit(params: {
    user_id: number;
    ton_tx_hash: string;
    amount: number;
    wallet_address: string;
  }): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
    try {
      const { user_id, ton_tx_hash, amount, wallet_address } = params;

      logger.info('[WalletService] Обработка TON депозита', {
        userId: user_id,
        amount,
        txHash: ton_tx_hash,
        walletAddress: wallet_address
      });

      // Проверяем, не был ли уже обработан этот депозит
      const existingTransaction = await supabase
        .from('transactions')
        .select('*')
        .eq('description', ton_tx_hash)
        .eq('type', 'DEPOSIT')
        .single();

      if (existingTransaction.data) {
        logger.warn('[WalletService] Депозит уже был обработан', {
          userId: user_id,
          txHash: ton_tx_hash
        });
        return {
          success: false,
          error: 'Этот депозит уже был обработан'
        };
      }

      // Начисляем TON на баланс пользователя
      const balanceResult = await BalanceManager.addBalance(user_id, amount, 'TON');
      
      if (!balanceResult.success) {
        throw new Error('Не удалось обновить баланс');
      }

      // Создаем запись транзакции
      const transactionResult = await UnifiedTransactionService.createTransaction({
        user_id,
        amount,
        type: 'DEPOSIT',
        currency: 'TON',
        status: 'completed',
        description: ton_tx_hash,
        metadata: {
          source: 'ton_deposit',
          wallet_address,
          tx_hash: ton_tx_hash
        }
      });

      if (!transactionResult.success) {
        // Откатываем баланс в случае ошибки
        await BalanceManager.subtractBalance(user_id, amount, 'TON');
        throw new Error('Не удалось создать транзакцию');
      }

      logger.info('[WalletService] TON депозит успешно обработан', {
        userId: user_id,
        amount,
        transactionId: transactionResult.transaction?.id
      });

      return {
        success: true,
        transaction_id: transactionResult.transaction?.id?.toString()
      };
    } catch (error) {
      logger.error('[WalletService] Ошибка при обработке TON депозита', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
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

      // Проверка минимальной суммы
      if (type === 'TON' && withdrawAmount < 1) {
        logger.warn('[WalletService] Сумма вывода TON меньше минимальной', { 
          userId, 
          requested: withdrawAmount, 
          minimum: 1
        });
        return { success: false, error: 'Минимальная сумма вывода — 1 TON' };
      }

      if (type === 'UNI' && withdrawAmount < 1000) {
        logger.warn('[WalletService] Сумма вывода UNI меньше минимальной', { 
          userId, 
          requested: withdrawAmount, 
          minimum: 1000
        });
        return { success: false, error: 'Минимальная сумма вывода — 1000 UNI' };
      }

      // Расчет и проверка комиссии для UNI
      let commission = 0;
      if (type === 'UNI') {
        commission = Math.ceil(withdrawAmount / 1000) * 0.1;
        const tonBalance = parseFloat(user.balance_ton || "0");
        
        // Добавляем детальное логирование для отладки
        logger.info('[WalletService] Проверка комиссии для вывода UNI', {
          userId,
          withdrawAmount,
          commission,
          tonBalance,
          userBalanceTonRaw: user.balance_ton,
          comparisonResult: tonBalance < commission,
          userObject: {
            id: user.id,
            balance_uni: user.balance_uni,
            balance_ton: user.balance_ton
          }
        });
        
        if (tonBalance < commission) {
          logger.warn('[WalletService] Недостаточно TON для оплаты комиссии', { 
            userId, 
            commission, 
            available: tonBalance
          });
          return { success: false, error: `Недостаточно TON для оплаты комиссии. Требуется ${commission} TON` };
        }
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

      // Создаем заявку на вывод для обеих валют
      const withdrawData: any = {
        user_id: parseInt(userId),
        telegram_id: user.telegram_id?.toString() || '',
        username: user.username || '',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Добавляем специфичные для валюты поля
      if (type === 'TON') {
        withdrawData.amount_ton = withdrawAmount;
        withdrawData.ton_wallet = walletAddress || '';
      } else if (type === 'UNI') {
        // Для UNI сохраняем сумму в amount_ton (универсальное поле amount)
        withdrawData.amount_ton = withdrawAmount;
        withdrawData.ton_wallet = walletAddress || ''; // Адрес для UNI
      }

      const { data: withdrawRequest, error: withdrawError } = await supabase
        .from('withdraw_requests')
        .insert(withdrawData)
        .select()
        .single();

      if (withdrawError) {
        logger.error('[WalletService] Ошибка создания заявки на вывод', { 
          userId, 
          error: withdrawError.message 
        });
        return { success: false, error: 'Ошибка создания заявки на вывод' };
      }



      // Обновляем баланс через централизованный BalanceManager
      const { balanceManager } = await import('../../core/BalanceManager');
      const amount_uni = type === 'UNI' ? withdrawAmount : 0;
      // Для TON списываем сумму вывода + комиссию за UNI (если есть)
      const amount_ton = type === 'TON' ? withdrawAmount : commission;
      
      const result = await balanceManager.subtractBalance(
        userId,
        amount_uni,
        amount_ton,
        'WalletService.withdraw'
      );

      if (!result.success) {
        // Если не удалось списать баланс, отменяем заявку
        await supabase
          .from('withdraw_requests')
          .update({ status: 'rejected' })
          .eq('user_id', parseInt(userId))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);
          
        logger.error('[WalletService] Ошибка обновления баланса при выводе', { 
          userId, 
          error: result.error 
        });
        return { success: false, error: result.error || 'Ошибка обновления баланса' };
      }

      // Создаем запись транзакции для основного вывода
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

      // Создаем запись транзакции для комиссии (если есть)
      if (type === 'UNI' && commission > 0) {
        const { error: commissionError } = await supabase
          .from(WALLET_TABLES.TRANSACTIONS)
          .insert({
            user_id: parseInt(userId),
            type: 'withdrawal_fee',
            amount_uni: '0',
            amount_ton: commission.toString(),
            currency: 'TON',
            status: 'completed',
            description: `Комиссия за вывод ${withdrawAmount} UNI`,
            created_at: new Date().toISOString()
          });

        if (commissionError) {
          logger.warn('[WalletService] Ошибка создания транзакции комиссии', { 
            userId, 
            error: commissionError.message 
          });
        }
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

  async createInternalDeposit(params: {
    user_id: number;
    amount: number;
    currency: 'UNI' | 'TON';
    type: string;
    description: string;
  }): Promise<{ success: boolean; error?: string; transaction_id?: string; new_balance?: number }> {
    try {
      const { user_id, amount, currency, type, description } = params;

      // Используем BalanceManager для атомарного начисления
      const { balanceManager } = await import('../../core/BalanceManager');
      
      const result = await balanceManager.addBalance(
        user_id,
        currency === 'UNI' ? amount : 0,
        currency === 'TON' ? amount : 0,
        description
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Ошибка создания внутреннего депозита'
        };
      }

      // Создаем запись транзакции
      const transactionId = `INTERNAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        await supabase.from(WALLET_TABLES.TRANSACTIONS).insert({
          user_id: user_id,
          type: type || 'INTERNAL_CREDIT',
          amount_uni: currency === 'UNI' ? amount.toString() : '0',
          amount_ton: currency === 'TON' ? amount.toString() : '0',
          description: description,
          status: 'completed',
          created_at: new Date().toISOString()
        });
      } catch (transactionError) {
        logger.warn('[WalletService] Не удалось создать запись транзакции для внутреннего депозита', { 
          user_id, 
          error: transactionError 
        });
      }

      logger.info('[WalletService] Внутренний депозит создан', {
        transaction_id: transactionId,
        user_id,
        amount,
        currency,
        type,
        description
      });

      return {
        success: true,
        transaction_id: transactionId,
        new_balance: result.newBalance ? 
          (currency === 'UNI' ? result.newBalance.balance_uni : result.newBalance.balance_ton) : 0
      };

    } catch (error) {
      logger.error('[WalletService] Ошибка создания внутреннего депозита', {
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: 'Внутренняя ошибка при создании депозита'
      };
    }
  }

  async createInternalWithdrawal(params: {
    user_id: number;
    amount: number;
    currency: 'UNI' | 'TON';
    type: string;
    description: string;
  }): Promise<{ success: boolean; error?: string; transaction_id?: string; new_balance?: number }> {
    try {
      const { user_id, amount, currency, type, description } = params;

      // Используем BalanceManager для атомарного списания
      const { balanceManager } = await import('../../core/BalanceManager');
      
      // Проверяем достаточность средств
      const checkResult = await balanceManager.hasSufficientBalance(
        user_id,
        currency === 'UNI' ? amount : 0,
        currency === 'TON' ? amount : 0
      );

      if (!checkResult.sufficient) {
        return {
          success: false,
          error: `Недостаточно средств. Доступно: ${checkResult.current ? 
            (currency === 'UNI' ? checkResult.current.balance_uni : checkResult.current.balance_ton) : 0} ${currency}`
        };
      }

      const result = await balanceManager.subtractBalance(
        user_id,
        currency === 'UNI' ? amount : 0,
        currency === 'TON' ? amount : 0,
        description
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Ошибка создания внутреннего списания'
        };
      }

      // Создаем запись транзакции
      const transactionId = `INTERNAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        await supabase.from(WALLET_TABLES.TRANSACTIONS).insert({
          user_id: user_id,
          type: type || 'INTERNAL_DEBIT',
          amount_uni: currency === 'UNI' ? `-${amount}` : '0',
          amount_ton: currency === 'TON' ? `-${amount}` : '0',
          description: description,
          status: 'completed',
          created_at: new Date().toISOString()
        });
      } catch (transactionError) {
        logger.warn('[WalletService] Не удалось создать запись транзакции для внутреннего списания', { 
          user_id, 
          error: transactionError 
        });
      }

      logger.info('[WalletService] Внутреннее списание создано', {
        transaction_id: transactionId,
        user_id,
        amount,
        currency,
        type,
        description
      });

      return {
        success: true,
        transaction_id: transactionId,
        new_balance: result.newBalance ? 
          (currency === 'UNI' ? result.newBalance.balance_uni : result.newBalance.balance_ton) : 0
      };

    } catch (error) {
      logger.error('[WalletService] Ошибка создания внутреннего списания', {
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        error: 'Внутренняя ошибка при создании списания'
      };
    }
  }
}