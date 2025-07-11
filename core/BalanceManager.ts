/**
 * ЦЕНТРАЛИЗОВАННЫЙ BALANCE MANAGER
 * Объединяет все 4 дублирующих реализации в единый сервис
 * Рефакторинг по рекомендациям: docs/UNIFARM_CENTRALIZATION_AUDIT_REPORT.md
 * 
 * УСТРАНЯЕТ ДУБЛИРОВАНИЕ:
 * - core/repositories/UserRepository.updateBalance()
 * - modules/user/model.updateBalance()  
 * - core/TransactionService.updateUserBalance()
 * - modules/wallet/directBalanceHandler.ts
 */

import { supabase } from './supabaseClient';
import { logger } from './logger';
import { BalanceNotificationService } from './balanceNotificationService';
import { balanceCache } from './BalanceCache';

export interface BalanceUpdateData {
  user_id: number;
  amount_uni?: number;
  amount_ton?: number;
  operation: 'add' | 'subtract' | 'set';
  source?: string;
  transaction_id?: number;
}

export interface UserBalance {
  user_id: number;
  balance_uni: number;
  balance_ton: number;
  last_updated: string;
}

export class BalanceManager {
  private static instance: BalanceManager;
  
  // Callback для уведомлений об изменении баланса (для WebSocket)
  public onBalanceUpdate?: (userId: number) => Promise<void>;

  public static getInstance(): BalanceManager {
    if (!BalanceManager.instance) {
      BalanceManager.instance = new BalanceManager();
    }
    return BalanceManager.instance;
  }

  /**
   * ЦЕНТРАЛИЗОВАННОЕ обновление баланса пользователя
   * Заменяет все 4 дублирующих реализации
   */
  async updateUserBalance(data: BalanceUpdateData): Promise<{ success: boolean; newBalance?: UserBalance; error?: string }> {
    try {
      const { user_id, amount_uni = 0, amount_ton = 0, operation, source = 'BalanceManager', transaction_id } = data;

      logger.info('[BalanceManager] Обновление баланса пользователя', {
        user_id,
        amount_uni,
        amount_ton,
        operation,
        source,
        transaction_id,
        timestamp: new Date().toISOString()
      });

      // Валидация данных
      if (!user_id || user_id <= 0) {
        return { success: false, error: 'Некорректный user_id' };
      }

      if (amount_uni === 0 && amount_ton === 0 && operation !== 'set') {
        return { success: false, error: 'Не указана сумма для обновления' };
      }

      // Получаем текущий баланс пользователя
      const currentBalance = await this.getUserBalance(user_id);
      if (!currentBalance.success) {
        return { success: false, error: currentBalance.error };
      }

      const current = currentBalance.balance!;
      let newUniBalance = current.balance_uni;
      let newTonBalance = current.balance_ton;

      // Вычисляем новый баланс в зависимости от операции
      switch (operation) {
        case 'add':
          newUniBalance = current.balance_uni + amount_uni;
          newTonBalance = current.balance_ton + amount_ton;
          break;
        case 'subtract':
          newUniBalance = Math.max(0, current.balance_uni - amount_uni);
          newTonBalance = Math.max(0, current.balance_ton - amount_ton);
          break;
        case 'set':
          newUniBalance = amount_uni;
          newTonBalance = amount_ton;
          break;
        default:
          return { success: false, error: 'Неподдерживаемая операция' };
      }

      // Обновляем баланс в базе данных
      logger.info('[BalanceManager] Попытка обновления баланса в Supabase', {
        user_id,
        newUniBalance: newUniBalance.toFixed(6),
        newTonBalance: newTonBalance.toFixed(6),
        operation
      });

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          balance_uni: parseFloat(newUniBalance.toFixed(6)), // Отправляем как число для NUMERIC типа
          balance_ton: parseFloat(newTonBalance.toFixed(6)) // Отправляем как число для NUMERIC типа
        })
        .eq('id', user_id)
        .select('id, balance_uni, balance_ton')
        .single();

      logger.info('[BalanceManager] Результат обновления в Supabase', {
        user_id,
        updateError: updateError?.message || null,
        updatedUser: updatedUser || null,
        success: !updateError
      });

      if (updateError) {
        logger.error('[BalanceManager] Ошибка обновления баланса в БД:', {
          user_id,
          error: updateError.message
        });
        return { success: false, error: `Ошибка обновления баланса: ${updateError.message}` };
      }

      const newBalance: UserBalance = {
        user_id: updatedUser.id,
        balance_uni: parseFloat(updatedUser.balance_uni),
        balance_ton: parseFloat(updatedUser.balance_ton),
        last_updated: new Date().toISOString()
      };

      // Обновляем кеш с новыми балансами
      balanceCache.set(user_id, newBalance.balance_uni, newBalance.balance_ton);

      // Логируем успешное обновление с деталями изменений
      logger.info('[BalanceManager] Баланс успешно обновлен', {
        user_id,
        operation,
        source,
        previous_uni: current.balance_uni,
        previous_ton: current.balance_ton,
        new_uni: newBalance.balance_uni,
        new_ton: newBalance.balance_ton,
        change_uni: operation === 'set' ? 'set' : (newBalance.balance_uni - current.balance_uni).toFixed(6),
        change_ton: operation === 'set' ? 'set' : (newBalance.balance_ton - current.balance_ton).toFixed(6)
      });

      logger.info('[BalanceManager] Баланс успешно обновлен:', {
        user_id,
        old_uni: current.balance_uni,
        new_uni: newBalance.balance_uni,
        old_ton: current.balance_ton,
        new_ton: newBalance.balance_ton,
        operation,
        source
      });

      // Отправляем WebSocket уведомление об обновлении баланса
      if (this.onBalanceUpdate) {
        this.onBalanceUpdate(user_id).catch(error => {
          logger.error('[BalanceManager] Ошибка при отправке WebSocket уведомления:', {
            user_id,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      }



      return { success: true, newBalance };

    } catch (error) {
      logger.error('[BalanceManager] Критическая ошибка обновления баланса:', {
        data,
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * ЦЕНТРАЛИЗОВАННОЕ получение баланса пользователя
   */
  async getUserBalance(user_id: number): Promise<{ success: boolean; balance?: UserBalance; error?: string }> {
    try {
      logger.info('[BalanceManager] Получение баланса пользователя', { user_id });

      if (!user_id || user_id <= 0) {
        return { success: false, error: 'Некорректный user_id' };
      }

      // Проверяем кеш
      const cached = balanceCache.get(user_id);
      if (cached) {
        return {
          success: true,
          balance: {
            user_id,
            balance_uni: cached.uniBalance,
            balance_ton: cached.tonBalance,
            last_updated: new Date().toISOString()
          }
        };
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, balance_uni, balance_ton')
        .eq('id', user_id)
        .single();

      if (error) {
        logger.error('[BalanceManager] Ошибка получения баланса:', {
          user_id,
          error: error.message
        });
        return { success: false, error: `Пользователь не найден: ${error.message}` };
      }

      const balance: UserBalance = {
        user_id: user.id,
        balance_uni: parseFloat(user.balance_uni || '0'),
        balance_ton: parseFloat(user.balance_ton || '0'),
        last_updated: new Date().toISOString()
      };

      // Сохраняем в кеш
      balanceCache.set(user_id, balance.balance_uni, balance.balance_ton);

      logger.info('[BalanceManager] Баланс получен и закеширован:', balance);
      return { success: true, balance };

    } catch (error) {
      logger.error('[BalanceManager] Критическая ошибка получения баланса:', {
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Пополнение баланса (добавление средств)
   */
  async addBalance(user_id: number, amount_uni: number = 0, amount_ton: number = 0, source?: string): Promise<{ success: boolean; newBalance?: UserBalance; error?: string }> {
    return this.updateUserBalance({
      user_id,
      amount_uni,
      amount_ton,
      operation: 'add',
      source: source || 'addBalance'
    });
  }

  /**
   * Списание с баланса (вычитание средств)
   */
  async subtractBalance(user_id: number, amount_uni: number = 0, amount_ton: number = 0, source?: string): Promise<{ success: boolean; newBalance?: UserBalance; error?: string }> {
    return this.updateUserBalance({
      user_id,
      amount_uni,
      amount_ton,
      operation: 'subtract',
      source: source || 'subtractBalance'
    });
  }

  /**
   * Установка точного баланса (перезапись)
   */
  async setBalance(user_id: number, amount_uni: number, amount_ton: number, source?: string): Promise<{ success: boolean; newBalance?: UserBalance; error?: string }> {
    return this.updateUserBalance({
      user_id,
      amount_uni,
      amount_ton,
      operation: 'set',
      source: source || 'setBalance'
    });
  }

  /**
   * Проверка достаточности средств для операции
   */
  async hasSufficientBalance(user_id: number, required_uni: number = 0, required_ton: number = 0): Promise<{ sufficient: boolean; current?: UserBalance; error?: string }> {
    try {
      const balanceResult = await this.getUserBalance(user_id);
      
      if (!balanceResult.success) {
        return { sufficient: false, error: balanceResult.error };
      }

      const current = balanceResult.balance!;
      const sufficient = current.balance_uni >= required_uni && current.balance_ton >= required_ton;

      logger.info('[BalanceManager] Проверка достаточности средств:', {
        user_id,
        required_uni,
        required_ton,
        current_uni: current.balance_uni,
        current_ton: current.balance_ton,
        sufficient
      });

      return { sufficient, current };

    } catch (error) {
      logger.error('[BalanceManager] Ошибка проверки достаточности средств:', {
        user_id,
        required_uni,
        required_ton,
        error: error instanceof Error ? error.message : String(error)
      });
      return { sufficient: false, error: 'Ошибка проверки баланса' };
    }
  }

  /**
   * Массовое обновление балансов (для batch операций)
   */
  async batchUpdateBalances(updates: BalanceUpdateData[]): Promise<{ 
    success: boolean; 
    successCount: number; 
    failureCount: number; 
    results: Array<{ user_id: number; success: boolean; error?: string }>;
  }> {
    try {
      logger.info('[BalanceManager] Массовое обновление балансов', { count: updates.length });

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const update of updates) {
        try {
          const result = await this.updateUserBalance(update);
          results.push({
            user_id: update.user_id,
            success: result.success,
            error: result.error
          });
          
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          results.push({
            user_id: update.user_id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          });
          failureCount++;
        }
      }

      logger.info('[BalanceManager] Массовое обновление завершено:', {
        total: updates.length,
        successCount,
        failureCount
      });

      return {
        success: failureCount === 0,
        successCount,
        failureCount,
        results
      };

    } catch (error) {
      logger.error('[BalanceManager] Критическая ошибка массового обновления:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        successCount: 0,
        failureCount: updates.length,
        results: updates.map(u => ({ user_id: u.user_id, success: false, error: 'Системная ошибка' }))
      };
    }
  }

  /**
   * Валидация корректности баланса через транзакции
   * Пересчитывает баланс на основе всех транзакций пользователя
   */
  async validateAndRecalculateBalance(user_id: number): Promise<{ success: boolean; corrected: boolean; newBalance?: UserBalance; error?: string }> {
    try {
      logger.info('[BalanceManager] Валидация и пересчет баланса:', { user_id });

      // Получаем все подтвержденные транзакции пользователя
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('type, amount_uni, amount_ton, description')
        .eq('user_id', user_id)
        .in('status', ['completed', 'confirmed']);

      if (txError) {
        logger.error('[BalanceManager] Ошибка получения транзакций для валидации:', txError);
        return { success: false, corrected: false, error: 'Ошибка получения транзакций' };
      }

      // Вычисляем корректный баланс на основе транзакций
      let calculatedUniBalance = 0;
      let calculatedTonBalance = 0;

      for (const tx of transactions || []) {
        const amount_uni = parseFloat(tx.amount_uni || '0');
        const amount_ton = parseFloat(tx.amount_ton || '0');
        
        // Определяем тип операции
        const isIncome = tx.description?.includes('доход') || 
                        tx.description?.includes('награда') ||
                        tx.description?.includes('бонус') ||
                        tx.description?.includes('Airdrop') ||
                        ['FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD'].includes(tx.type);
        
        if (isIncome) {
          calculatedUniBalance += amount_uni;
          calculatedTonBalance += amount_ton;
        } else {
          calculatedUniBalance -= amount_uni;
          calculatedTonBalance -= amount_ton;
        }
      }

      // Обеспечиваем неотрицательность баланса
      calculatedUniBalance = Math.max(0, calculatedUniBalance);
      calculatedTonBalance = Math.max(0, calculatedTonBalance);

      // Получаем текущий баланс
      const currentBalanceResult = await this.getUserBalance(user_id);
      if (!currentBalanceResult.success) {
        return { success: false, corrected: false, error: currentBalanceResult.error };
      }

      const currentBalance = currentBalanceResult.balance!;
      
      // Проверяем, нужна ли коррекция
      const needsCorrection = Math.abs(currentBalance.balance_uni - calculatedUniBalance) > 0.000001 ||
                             Math.abs(currentBalance.balance_ton - calculatedTonBalance) > 0.000001;

      if (needsCorrection) {
        logger.info('[BalanceManager] Обнаружено расхождение, корректируем баланс:', {
          user_id,
          current_uni: currentBalance.balance_uni,
          calculated_uni: calculatedUniBalance,
          current_ton: currentBalance.balance_ton,
          calculated_ton: calculatedTonBalance
        });

        const correctionResult = await this.setBalance(
          user_id,
          calculatedUniBalance,
          calculatedTonBalance,
          'BalanceValidation'
        );

        return {
          success: correctionResult.success,
          corrected: true,
          newBalance: correctionResult.newBalance,
          error: correctionResult.error
        };
      }

      logger.info('[BalanceManager] Баланс корректен, коррекция не требуется:', { user_id });
      return {
        success: true,
        corrected: false,
        newBalance: currentBalance
      };

    } catch (error) {
      logger.error('[BalanceManager] Критическая ошибка валидации баланса:', {
        user_id,
        error: error instanceof Error ? error.message : String(error)
      });
      return { success: false, corrected: false, error: 'Ошибка валидации баланса' };
    }
  }
}

// Экспорт singleton instance для использования в других модулях
export const balanceManager = BalanceManager.getInstance();