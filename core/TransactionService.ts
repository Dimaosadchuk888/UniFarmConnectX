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
  'FARMING_DEPOSIT': 'FARMING_DEPOSIT',   // Добавлен прямой маппинг для депозитов
  'REFERRAL_REWARD': 'REFERRAL_REWARD', 
  'MISSION_REWARD': 'MISSION_REWARD',
  'DAILY_BONUS': 'DAILY_BONUS',
  'WITHDRAWAL': 'WITHDRAWAL',              // Добавлен прямой маппинг для выводов
  'DEPOSIT': 'DEPOSIT',                    // Добавлен прямой маппинг для депозитов
  'BOOST_PAYMENT': 'BOOST_PAYMENT',        // Добавлен прямой маппинг для платежей
  'TON_DEPOSIT': 'TON_DEPOSIT',            // 🚨 КРИТИЧНО: НЕ мапить в FARMING_REWARD! Это создает двойное начисление!
  'TON_BOOST_PURCHASE': 'TON_BOOST_PURCHASE', // TON Boost покупки → TON_BOOST_PURCHASE
  // Маппинг расширенных типов на базовые
  'TON_BOOST_INCOME': 'FARMING_REWARD',   // TON Boost доходы → FARMING_REWARD
  'UNI_DEPOSIT': 'DEPOSIT',               // UNI депозиты → DEPOSIT (ИСПРАВЛЕНО: было FARMING_REWARD)
  'UNI_WITHDRAWAL': 'WITHDRAWAL',         // Выводы UNI → WITHDRAWAL
  'TON_WITHDRAWAL': 'WITHDRAWAL',         // Выводы TON → WITHDRAWAL
  'BOOST_PURCHASE': 'BOOST_PAYMENT',      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: было FARMING_REWARD → теперь BOOST_PAYMENT
  'AIRDROP_REWARD': 'DAILY_BONUS',        // Airdrop награды → DAILY_BONUS
  // Маппинг lowercase для обратной совместимости
  'withdrawal': 'WITHDRAWAL',              // Lowercase вывод → WITHDRAWAL
  'withdrawal_fee': 'WITHDRAWAL'           // Lowercase комиссия → WITHDRAWAL (комиссии отображаются как выводы)
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

      // Определяем общую сумму и валюту транзакции
      const amount = amount_uni > 0 ? amount_uni : amount_ton;
      const transactionCurrency = amount_uni > 0 ? 'UNI' : 'TON';

      // 🛡️ КРИТИЧЕСКАЯ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ (ИСПРАВЛЕННАЯ + REFERRAL_REWARD)
      // Проверяем существование записи с таким же tx_hash_unique
      const txHashToCheck = metadata?.tx_hash || metadata?.ton_tx_hash;
      if (txHashToCheck) {
        logger.info('[UnifiedTransactionService] Проверка дублирования для tx_hash:', txHashToCheck);
        
        // Извлекаем базовый BOC без суффиксов для проверки дубликатов
        const baseBoc = this.extractBaseBoc(txHashToCheck);
        logger.info('[UnifiedTransactionService] Базовый BOC для дедупликации:', baseBoc);
        
        // ИСПРАВЛЕННАЯ множественная проверка дублирования 
        const { data: existingTransactions, error: checkError } = await supabase
          .from('transactions')
          .select('id, created_at, user_id, amount_ton, type, description, tx_hash_unique')
          .or(`tx_hash_unique.eq."${txHashToCheck}",tx_hash_unique.eq."${baseBoc}",tx_hash_unique.like."${baseBoc}%"`)
          .order('created_at', { ascending: false });
          
        if (existingTransactions && existingTransactions.length > 0 && !checkError) {
          const existing = existingTransactions[0];
          logger.warn('[UnifiedTransactionService] ДУБЛИРОВАНИЕ ПРЕДОТВРАЩЕНО (УСИЛЕННАЯ ПРОВЕРКА):', {
            existing_id: existing.id,
            existing_date: existing.created_at,
            existing_user: existing.user_id,
            existing_amount: existing.amount_ton,
            existing_type: existing.type,
            attempted_user: user_id,
            attempted_amount: amount_ton,
            attempted_type: type,
            tx_hash: txHashToCheck,
            total_found: existingTransactions.length
          });
          
          // Дополнительная проверка на короткие интервалы времени для одного пользователя
          const recentDuplicates = existingTransactions.filter(tx => 
            tx.user_id === user_id && 
            (new Date().getTime() - new Date(tx.created_at).getTime()) < 5000 // 5 секунд
          );
          
          if (recentDuplicates.length > 0) {
            logger.error('[UnifiedTransactionService] КРИТИЧЕСКОЕ ДУБЛИРОВАНИЕ - Попытка повторного депозита в течение 5 секунд!', {
              user_id,
              tx_hash: txHashToCheck,
              recent_duplicates: recentDuplicates.length
            });
          }
          
          return { 
            success: false, 
            error: `Транзакция с hash ${txHashToCheck.substring(0, 20)}... уже существует`
          };
        }
        
        logger.info('[UnifiedTransactionService] Проверка дублирования пройдена для:', txHashToCheck);
      }

      // 🛡️ НОВАЯ КРИТИЧЕСКАЯ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ REFERRAL_REWARD
      // Проверяем дубликаты для REFERRAL_REWARD транзакций (они не имеют tx_hash)
      if (type === 'REFERRAL_REWARD' && metadata?.source_user_id && metadata?.level) {
        logger.info('[UnifiedTransactionService] Проверка дедупликации REFERRAL_REWARD:', {
          user_id,
          source_user_id: metadata.source_user_id,
          level: metadata.level,
          amount_uni,
          amount_ton
        });

        // Создаем временное окно дедупликации (10 минут)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        
        // Ищем существующие REFERRAL_REWARD с теми же параметрами за последние 10 минут
        const { data: existingReferralRewards, error: referralCheckError } = await supabase
          .from('transactions')
          .select('id, created_at, user_id, amount, amount_uni, amount_ton, metadata')
          .eq('type', 'REFERRAL_REWARD')
          .eq('user_id', user_id)
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false });

        if (!referralCheckError && existingReferralRewards) {
          // Фильтруем по метаданным (source_user_id, level) и сумме
          const matchingRewards = existingReferralRewards.filter(tx => {
            const txMetadata = tx.metadata || {};
            const sameSourceUser = txMetadata.source_user_id === metadata.source_user_id;
            const sameLevel = txMetadata.level === metadata.level;
            const sameAmountUni = Math.abs(parseFloat(tx.amount_uni || '0') - amount_uni) < 0.00000001;
            const sameAmountTon = Math.abs(parseFloat(tx.amount_ton || '0') - amount_ton) < 0.00000001;
            
            return sameSourceUser && sameLevel && (sameAmountUni || sameAmountTon);
          });

          if (matchingRewards.length > 0) {
            const existing = matchingRewards[0];
            const timeDiff = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
            
            logger.warn('[UnifiedTransactionService] REFERRAL_REWARD ДУБЛИРОВАНИЕ ПРЕДОТВРАЩЕНО:', {
              existing_id: existing.id,
              existing_date: existing.created_at,
              time_diff_seconds: timeDiff,
              attempted_user: user_id,
              source_user_id: metadata.source_user_id,
              level: metadata.level,
              amount_uni,
              amount_ton,
              total_found: matchingRewards.length
            });
            
            return { 
              success: false, 
              error: `Дублирование REFERRAL_REWARD предотвращено (${timeDiff.toFixed(0)}s назад)`
            };
          }
        }
        
        logger.info('[UnifiedTransactionService] REFERRAL_REWARD дедупликация пройдена');
      }

      // Создание записи транзакции
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id,
          type: dbTransactionType,  // Используем преобразованный тип
          amount: amount.toString(),  // Используем новое поле amount
          amount_uni: amount_uni.toString(),
          amount_ton: amount_ton.toString(),
          currency: currency || transactionCurrency,  // Используем переданную валюту или определяем автоматически
          status,
          description: enhancedDescription,
          metadata: { ...metadata, original_type: metadata?.original_type || type },  // Приоритет metadata.original_type, fallback на type
          source_user_id: source_user_id || user_id,
          tx_hash_unique: metadata?.tx_hash || metadata?.ton_tx_hash || null, // Поддержка обоих форматов для совместимости со стабильным ремиксом
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
   * Извлекает базовый BOC из хеша, удаляя суффиксы timestamp и random
   * @param hash Полный хеш транзакции (может содержать суффиксы)
   * @returns Базовый BOC без суффиксов
   */
  private extractBaseBoc(hash: string): string {
    // Если хеш содержит BOC-подобную структуру (начинается с te6)
    if (hash.startsWith('te6')) {
      // Ищем паттерн суффикса: _timestamp_randomstring
      const suffixPattern = /_\d{13}_[a-z0-9]+$/;
      const baseBoc = hash.replace(suffixPattern, '');
      return baseBoc;
    }
    return hash;
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
      logger.info('[UnifiedTransactionService] Запрос транзакций для user_id:', {
        user_id,
        filters
      });
      
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
      
      // ВАЖНО: Фильтр по валюте на уровне БД для правильной пагинации
      if (filters?.currency && filters.currency !== 'ALL') {
        query = query.eq('currency', filters.currency);
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

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        transactions: unifiedTransactions,
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
    // Используем новое поле amount, если оно есть
    const amount = tx.amount ? parseFloat(tx.amount) : 0;
    
    // Определяем валюту из поля currency или на основе amount_uni/amount_ton
    let currency = tx.currency || 'UNI';
    
    // Fallback для старых транзакций без поля amount
    if (!tx.amount || amount === 0) {
      const amount_uni = parseFloat(tx.amount_uni || '0');
      const amount_ton = parseFloat(tx.amount_ton || '0');
      currency = amount_uni > 0 ? 'UNI' : 'TON';
      const fallbackAmount = currency === 'UNI' ? amount_uni : amount_ton;
      
      return {
        id: tx.id,
        type: tx.type,
        amount: fallbackAmount,
        currency,
        status: tx.status,
        description: tx.description || '',
        createdAt: tx.created_at,
        timestamp: new Date(tx.created_at).getTime()
      };
    }

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
      case 'DEPOSIT':
        return `Пополнение ${currency}: ${amount}`;
      case 'UNI_WITHDRAWAL':
        return `Вывод UNI: ${amount}`;
      case 'TON_WITHDRAWAL':
        return `Вывод TON: ${amount}`;
      case 'BOOST_PURCHASE':
        return `Покупка Boost пакета: ${amount} ${currency}`;
      case 'AIRDROP_REWARD':
        return `Airdrop награда: ${amount} ${currency}`;
      case 'BOOST_PAYMENT':
        return `Платеж за Boost пакет: ${amount} ${currency}`;
      case 'WITHDRAWAL':
      case 'withdrawal':
        return `Вывод ${amount} ${currency}`;
      case 'withdrawal_fee':
        return `Комиссия за вывод: ${amount} ${currency}`;
      case 'FARMING_REWARD':
        return currency === 'UNI' ? `UNI Farming доход: ${amount} UNI` : `TON Boost доход: ${amount} TON`;
      case 'REFERRAL_REWARD':
        return `Реферальный бонус: ${amount} ${currency}`;
      case 'MISSION_REWARD':
        return `Награда за миссию: ${amount} ${currency}`;
      case 'DAILY_BONUS':
        return `Ежедневный бонус: ${amount} ${currency}`;
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
      'UNI_DEPOSIT',      // UNI депозиты обновляют баланс
      'TON_DEPOSIT',      // TON депозиты обновляют баланс  
      'AIRDROP_REWARD',
      'DEPOSIT'           // Существующие DEPOSIT транзакции обновляют баланс
      // BOOST_PAYMENT и BOOST_PURCHASE НЕ входят в список - НЕ обновляют баланс
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
      // Используем BalanceManager для централизованного обновления баланса
      const { BalanceManager } = await import('./BalanceManager');
      const balanceManager = BalanceManager.getInstance();
      
      if (amount_uni > 0) {
        await balanceManager.addBalance(user_id, amount_uni, 0);
      }
      
      if (amount_ton > 0) {
        await balanceManager.addBalance(user_id, 0, amount_ton);
      }

      logger.info('[UnifiedTransactionService] Баланс обновлен успешно', {
        user_id,
        amount_uni,
        amount_ton,
        type
      });

    } catch (error) {
      logger.error('[UnifiedTransactionService] Ошибка обновления баланса', {
        user_id,
        amount_uni,
        amount_ton,
        type,
        error
      });
      // НЕ блокируем создание транзакции при ошибке баланса
    }
  }

  /**
   * Проверяет, является ли тип транзакции выводом средств
   */
  private isWithdrawalType(type: ExtendedTransactionType): boolean {
    const withdrawalTypes: ExtendedTransactionType[] = [
      'UNI_WITHDRAWAL',
      'TON_WITHDRAWAL',
      'BOOST_PURCHASE',
      'WITHDRAWAL',
      'withdrawal',
      'withdrawal_fee'
    ];
    
    return withdrawalTypes.includes(type);
  }
}

// Экспорт singleton instance для использования в других модулях
export const transactionService = UnifiedTransactionService.getInstance();