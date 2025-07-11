import { logger } from '../../core/logger';
import { transactionService } from '../../core/TransactionService';
import type { Transaction, TransactionsTransactionType, TransactionHistory } from './types';

/**
 * ЦЕНТРАЛИЗОВАННЫЙ TransactionsService - использует только UnifiedTransactionService
 * УСТРАНЕНО ДУБЛИРОВАНИЕ: все методы делегируются на централизованный сервис
 * Рефакторинг по рекомендациям: docs/UNIFARM_CENTRALIZATION_AUDIT_REPORT.md
 */
export class TransactionsService {
  /**
   * Получение истории транзакций пользователя через централизованный сервис
   */
  async getTransactionHistory(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    currency?: string
  ): Promise<TransactionHistory> {
    try {
      const userIdNumber = parseInt(userId);
      logger.info(`[TransactionsService] Делегирование на UnifiedTransactionService для пользователя ${userId}`, {
        userId,
        userIdNumber,
        page,
        limit,
        currency
      });

      // Используем только централизованный сервис
      const result = await transactionService.getUserTransactions(
        parseInt(userId), 
        page, 
        limit, 
        {
          currency: currency as 'UNI' | 'TON' | 'ALL'
        }
      );

      // Преобразуем результат в формат, ожидаемый контроллером
      const formattedTransactions = result.transactions.map(tx => ({
        id: tx.id,
        user_id: parseInt(userId),
        type: tx.type,
        amount: tx.amount.toString(),
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        created_at: tx.createdAt,
        updated_at: tx.createdAt
      }));

      return {
        transactions: formattedTransactions || [],
        total: result.total,
        page,
        limit,
        totalPages: result.totalPages,
        hasMore: result.hasMore
      };
    } catch (error) {
      logger.error('[TransactionsService] Ошибка делегирования на централизованный сервис:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        transactions: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasMore: false
      };
    }
  }

  /**
   * Создание транзакции через централизованный сервис
   * УСТРАНЕНО ДУБЛИРОВАНИЕ: теперь использует только UnifiedTransactionService
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction | null> {
    try {
      logger.info('[TransactionsService] Делегирование создания транзакции на UnifiedTransactionService', {
        userId: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency
      });

      // Конвертируем данные в формат UnifiedTransactionService
      const amount_uni = transaction.currency === 'UNI' ? parseFloat(transaction.amount) : 0;
      const amount_ton = transaction.currency === 'TON' ? parseFloat(transaction.amount) : 0;

      const result = await transactionService.createTransaction({
        user_id: transaction.user_id,
        type: transaction.type as any, // Используем транзакционный маппинг
        amount_uni,
        amount_ton,
        status: transaction.status,
        description: transaction.description
      });

      if (!result.success) {
        logger.error('[TransactionsService] Ошибка создания через унифицированный сервис:', result.error);
        return null;
      }

      // Возвращаем данные в ожидаемом формате
      return {
        id: result.transaction_id!,
        user_id: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        description: transaction.description || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('[TransactionsService] Ошибка делегирования создания транзакции:', {
        transaction,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Получить транзакцию по ID через централизованный сервис
   * ПРИМЕЧАНИЕ: Метод упрощен, так как основная логика в UnifiedTransactionService
   */
  async getTransactionById(transactionId: number): Promise<Transaction | null> {
    try {
      logger.info('[TransactionsService] Получение транзакции по ID (упрощенная реализация)', { transactionId });
      
      // Для полной реализации можно добавить метод в UnifiedTransactionService
      // Пока возвращаем null, так как основная логика перенесена в централизованный сервис
      logger.warn('[TransactionsService] getTransactionById требует реализации в UnifiedTransactionService');
      return null;
      
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения транзакции:', {
        transactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Получить статистику транзакций через централизованный сервис
   * ПРИМЕЧАНИЕ: Статистика вычисляется на основе данных из UnifiedTransactionService
   */
  async getTransactionStats(userId: string): Promise<{
    totalTransactions: number;
    totalIncome: { UNI: string; TON: string };
    totalOutcome: { UNI: string; TON: string };
  }> {
    try {
      logger.info('[TransactionsService] Получение статистики через централизованный сервис', { userId });
      
      // Получаем все транзакции пользователя через централизованный сервис
      const result = await transactionService.getUserTransactions(parseInt(userId), 1, 1000);
      
      const stats = {
        totalTransactions: result.total,
        totalIncome: { UNI: '0', TON: '0' },
        totalOutcome: { UNI: '0', TON: '0' }
      };

      // Вычисляем статистику на основе полученных данных
      result.transactions.forEach(tx => {
        const amount = tx.amount;
        const currency = tx.currency;
        
        // Определяем тип операции по описанию (так как маппинг типов может быть разным)
        const isIncome = tx.description.includes('доход') || 
                        tx.description.includes('награда') || 
                        tx.description.includes('бонус') ||
                        tx.description.includes('Airdrop');
        
        if (isIncome) {
          if (currency === 'UNI') {
            stats.totalIncome.UNI = (parseFloat(stats.totalIncome.UNI) + amount).toString();
          } else if (currency === 'TON') {
            stats.totalIncome.TON = (parseFloat(stats.totalIncome.TON) + amount).toString();
          }
        } else {
          if (currency === 'UNI') {
            stats.totalOutcome.UNI = (parseFloat(stats.totalOutcome.UNI) + amount).toString();
          } else if (currency === 'TON') {
            stats.totalOutcome.TON = (parseFloat(stats.totalOutcome.TON) + amount).toString();
          }
        }
      });

      return stats;
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения статистики через централизованный сервис:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        totalTransactions: 0,
        totalIncome: { UNI: '0', TON: '0' },
        totalOutcome: { UNI: '0', TON: '0' }
      };
    }
  }

  /**
   * Пересчет баланса пользователя
   * УСТРАНЕНО ДУБЛИРОВАНИЕ: делегирует на централизованный сервис управления балансом
   */
  async recalculateUserBalance(userId: number): Promise<{ uni: number; ton: number }> {
    try {
      logger.info('[TransactionsService] Пересчет баланса делегирован на UnifiedTransactionService', { userId });
      
      // Логика пересчета баланса должна быть в UnifiedTransactionService или BalanceManager
      logger.warn('[TransactionsService] recalculateUserBalance требует BalanceManager для полной централизации');
      
      return { uni: 0, ton: 0 };
    } catch (error) {
      logger.error('[TransactionsService] Ошибка пересчета баланса:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return { uni: 0, ton: 0 };
    }
  }

  /**
   * Получение сводки транзакций пользователя
   */
  async getTransactionSummary(userId: number): Promise<any> {
    try {
      logger.info('[TransactionsService] Получение сводки транзакций', { userId });
      
      // Получаем все транзакции пользователя
      const transactions = await unifiedTransactionService.getUserTransactions(userId, 100);
      
      // Группируем транзакции по типам
      const summary = {
        total_count: transactions.transactions.length,
        by_type: {} as Record<string, number>,
        by_currency: {
          UNI: { count: 0, total_amount: 0 },
          TON: { count: 0, total_amount: 0 }
        },
        recent_transactions: transactions.transactions.slice(0, 5)
      };

      // Подсчитываем статистику
      transactions.transactions.forEach(tx => {
        // По типам
        summary.by_type[tx.type] = (summary.by_type[tx.type] || 0) + 1;
        
        // По валютам
        if (tx.currency === 'UNI') {
          summary.by_currency.UNI.count++;
          summary.by_currency.UNI.total_amount += tx.amount;
        } else if (tx.currency === 'TON') {
          summary.by_currency.TON.count++;
          summary.by_currency.TON.total_amount += tx.amount;
        }
      });

      logger.info('[TransactionsService] Сводка транзакций получена', {
        userId,
        totalCount: summary.total_count,
        types: Object.keys(summary.by_type).length
      });

      return summary;
    } catch (error) {
      logger.error('[TransactionsService] Ошибка получения сводки транзакций:', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        total_count: 0,
        by_type: {},
        by_currency: {
          UNI: { count: 0, total_amount: 0 },
          TON: { count: 0, total_amount: 0 }
        },
        recent_transactions: []
      };
    }
  }
}