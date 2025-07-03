/**
 * Унифицированный сервис для управления транзакциями во всех модулях UniFarm
 * Обеспечивает единообразное создание, обновление и получение транзакций
 */

import { supabase } from './supabaseClient';
import { logger } from './logger';
import type { TransactionsTransactionType, TransactionsTransactionStatus, ExtendedTransactionType } from '../modules/transactions/types';

// Маппинг расширенных типов на поддерживаемые базой данных
const TRANSACTION_TYPE_MAPPING: Record<ExtendedTransactionType, TransactionsTransactionType> = {
  'FARMING_REWARD': 'FARMING_REWARD',
  'REFERRAL_REWARD': 'REFERRAL_REWARD', 
  'MISSION_REWARD': 'MISSION_REWARD',
  'DAILY_BONUS': 'DAILY_BONUS',
  // Маппинг расширенных типов на базовые
  'TON_BOOST_INCOME': 'FARMING_REWARD',   // TON Boost доходы → FARMING_REWARD
  'UNI_DEPOSIT': 'FARMING_REWARD',        // UNI депозиты → FARMING_REWARD
  'TON_DEPOSIT': 'FARMING_REWARD',        // TON депозиты → FARMING_REWARD
  'UNI_WITHDRAWAL': 'FARMING_REWARD',     // Выводы → FARMING_REWARD (с отрицательной суммой)
  'TON_WITHDRAWAL': 'FARMING_REWARD',     // Выводы → FARMING_REWARD (с отрицательной суммой)
  'BOOST_PURCHASE': 'FARMING_REWARD',     // Покупки boost → FARMING_REWARD
  'AIRDROP_REWARD': 'DAILY_BONUS'         // Airdrop награды → DAILY_BONUS
};

export interface TransactionData {
  user_id: number;
  type: ExtendedTransactionType;  // Используем расширенный тип для входных данных
  amount_uni?: number;
  amount_ton?: number;
  currency?: 'UNI' | 'TON';
  status?: TransactionsTransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  source_user_id?: number;
}

export interface TransactionResponse {
  id: number;
  type: TransactionsTransactionType;
  amount: number;
  currency: 'UNI' | 'TON';
  status: TransactionsTransactionStatus;
  description: string;
  createdAt: string;
  timestamp: number;
}

export class UnifiedTransactionService {
  private static instance: UnifiedTransactionService;

  public static getInstance(): UnifiedTransactionService {
    if (!UnifiedTransactionService.instance) {
      UnifiedTransactionService.instance = new UnifiedTransactionService();
    }
    return UnifiedTransactionService.instance;
  }

  /**
   * Создание транзакции с автоматическим обновлением баланса
   */
  async createTransaction(data: TransactionData): Promise<{ success: boolean; transaction_id?: number; error?: string }> {
    try {
      const {
        user_id,
        type,
        amount_uni = 0,
        amount_ton = 0,
        currency,
        status = 'completed',
        description = '',
        metadata = {},
        source_user_id
      } = data;

      // Валидация данных
      if (!user_id || !type) {
        return { success: false, error: 'Отсутствуют обязательные поля: user_id, type' };
      }

      if (amount_uni === 0 && amount_ton === 0) {
        return { success: false, error: 'Сумма транзакции должна быть больше 0' };
      }

      // Преобразуем расширенный тип в поддерживаемый базой данных
      const dbTransactionType = TRANSACTION_TYPE_MAPPING[type];
      
      // Создаем улучшенное описание с информацией об оригинальном типе
      const enhancedDescription = description || this.generateDescription(type, amount_uni, amount_ton);

      // Создание записи транзакции
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id,
          type: dbTransactionType,  // Используем преобразованный тип
          amount_uni: amount_uni.toString(),
          amount_ton: amount_ton.toString(),
          status,
          description: enhancedDescription,
          metadata: { ...metadata, original_type: type },  // Сохраняем оригинальный тип в metadata
          source_user_id: source_user_id || user_id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (txError) {
        logger.error('[UnifiedTransactionService] Ошибка создания транзакции:', { error: txError.message, data });
        return { success: false, error: `Ошибка создания транзакции: ${txError.message}` };
      }

      // Автоматическое обновление баланса пользователя для транзакций доходов
      if (this.shouldUpdateBalance(type)) {
        await this.updateUserBalance(user_id, amount_uni, amount_ton, dbTransactionType);
      }

      logger.info('[UnifiedTransactionService] Транзакция создана:', {
        transaction_id: transaction.id,
        user_id,
        type,
        amount_uni,
        amount_ton
      });

      return { success: true, transaction_id: transaction.id };

    } catch (error) {
      logger.error('[UnifiedTransactionService] Критическая ошибка создания транзакции:', error);
      return { success: false, error: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Получение истории транзакций пользователя с унифицированной структурой
   */
  async getUserTransactions(
    user_id: number, 
    page: number = 1, 
    limit: number = 20,
    filters?: { 
      type?: TransactionsTransactionType;
      currency?: 'UNI' | 'TON' | 'ALL';
      status?: TransactionsTransactionStatus;
    }
  ): Promise<{
    transactions: TransactionResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    try {
      let query = supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      // Применяем фильтры
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Пагинация
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: transactions, error, count } = await query;

      if (error) {
        logger.error('[UnifiedTransactionService] Ошибка получения транзакций:', error);
        return {
          transactions: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false
        };
      }

      // Преобразование в унифицированный формат
      const unifiedTransactions = transactions?.map(tx => this.formatTransactionResponse(tx)) || [];

      // Фильтрация по валюте на уровне приложения
      const filteredTransactions = filters?.currency && filters.currency !== 'ALL'
        ? unifiedTransactions.filter(tx => tx.currency === filters.currency)
        : unifiedTransactions;

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        transactions: filteredTransactions,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages
      };

    } catch (error) {
      logger.error('[UnifiedTransactionService] Критическая ошибка получения транзакций:', error);
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
   * Форматирование транзакции в унифицированный формат для frontend
   */
  private formatTransactionResponse(tx: any): TransactionResponse {
    const amount_uni = parseFloat(tx.amount_uni || '0');
    const amount_ton = parseFloat(tx.amount_ton || '0');
    
    // Определяем основную валюту и сумму
    const currency = amount_uni > 0 ? 'UNI' : 'TON';
    const amount = currency === 'UNI' ? amount_uni : amount_ton;

    return {
      id: tx.id,
      type: tx.type,
      amount,
      currency,
      status: tx.status,
      description: tx.description || '',
      createdAt: tx.created_at,
      timestamp: new Date(tx.created_at).getTime()
    };
  }

  /**
   * Генерирует описание по умолчанию для транзакции
   */
  private generateDescription(type: ExtendedTransactionType, amount_uni: number, amount_ton: number): string {
    const currency = amount_uni > 0 ? 'UNI' : 'TON';
    const amount = amount_uni > 0 ? amount_uni : amount_ton;
    
    switch (type) {
      case 'TON_BOOST_INCOME':
        return `TON Boost доход: ${amount} ${currency}`;
      case 'UNI_DEPOSIT':
        return `Пополнение UNI: ${amount}`;
      case 'TON_DEPOSIT':
        return `Пополнение TON: ${amount}`;
      case 'UNI_WITHDRAWAL':
        return `Вывод UNI: ${amount}`;
      case 'TON_WITHDRAWAL':
        return `Вывод TON: ${amount}`;
      case 'BOOST_PURCHASE':
        return `Покупка Boost пакета: ${amount} ${currency}`;
      case 'AIRDROP_REWARD':
        return `Airdrop награда: ${amount} ${currency}`;
      default:
        return `${type}: ${amount} ${currency}`;
    }
  }

  /**
   * Определяет, нужно ли обновлять баланс пользователя для данного типа транзакции
   */
  private shouldUpdateBalance(type: ExtendedTransactionType): boolean {
    const incomeTypes: ExtendedTransactionType[] = [
      'FARMING_REWARD',
      'REFERRAL_REWARD', 
      'MISSION_REWARD',
      'DAILY_BONUS',
      'TON_BOOST_INCOME',
      'UNI_DEPOSIT',
      'TON_DEPOSIT',
      'AIRDROP_REWARD'
    ];
    
    return incomeTypes.includes(type);
  }

  /**
   * Обновление баланса пользователя через централизованный BalanceManager
   * УСТРАНЕНО ДУБЛИРОВАНИЕ: делегирует на BalanceManager
   */
  private async updateUserBalance(
    user_id: number, 
    amount_uni: number, 
    amount_ton: number, 
    type: TransactionsTransactionType
  ): Promise<void> {
    try {
      const { balanceManager } = await import('./BalanceManager');
      
      // Определяем тип операции
      const operation = this.isWithdrawalType(type) ? 'subtract' : 'add';
      
      const result = await balanceManager.updateUserBalance({
        user_id,
        amount_uni,
        amount_ton,
        operation,
        source: 'UnifiedTransactionService'
      });

      if (!result.success) {
        logger.error('[UnifiedTransactionService] Ошибка обновления баланса через BalanceManager:', {
          user_id,
          error: result.error
        });
      } else {
        logger.info('[UnifiedTransactionService] Баланс обновлен через BalanceManager:', {
          user_id,
          amount_uni,
          amount_ton,
          operation
        });
      }

    } catch (error) {
      logger.error('[UnifiedTransactionService] Критическая ошибка делегирования обновления баланса:', error);
    }
  }

  /**
   * Проверяет, является ли тип транзакции выводом средств
   */
  private isWithdrawalType(type: ExtendedTransactionType): boolean {
    const withdrawalTypes: ExtendedTransactionType[] = [
      'UNI_WITHDRAWAL',
      'TON_WITHDRAWAL',
      'BOOST_PURCHASE'
    ];
    
    return withdrawalTypes.includes(type);
  }
}

// Экспорт singleton instance для использования в других модулях
export const transactionService = UnifiedTransactionService.getInstance();