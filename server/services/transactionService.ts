/**
 * Сервис для работы с транзакциями
 * Содержит константы и перечисления для работы с транзакциями
 */

import { db } from '../db';
import { transactions } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Типы транзакций
 */
export enum TransactionType {
  // Базовые операции
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  
  // Фарминг и награды
  FARMING_DEPOSIT = 'farming_deposit',
  FARMING_HARVEST = 'farming_harvest',
  FARMING_REWARD = 'farming_reward',
  
  // TON Boost
  TON_BOOST = 'ton_boost',
  TON_BOOST_REWARD = 'ton_boost_reward',
  
  // Реферальная система
  REFERRAL_REWARD = 'referral_reward',
  
  // Прочие
  REFUND = 'refund',
  BONUS = 'bonus'
}

/**
 * Валюты для транзакций
 */
export enum Currency {
  UNI = 'UNI',
  TON = 'TON'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

/**
 * Категории транзакций для группировки
 */
export enum TransactionCategory {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FARMING = 'farming',
  TON_BOOST = 'ton_boost',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  SYSTEM = 'system'
}

/**
 * Интерфейс для создания транзакций
 */
export interface CreateTransactionParams {
  userId: number;
  type: string;
  amount: string;
  currency: string;
  status: string;
  walletAddress?: string | null;
  source?: string;
  description?: string;
  category?: string;
  txHash?: string;
}

/**
 * Класс TransactionService для работы с транзакциями
 * Этот класс будет развиваться с добавлением методов работы с транзакциями
 */
export class TransactionService {
  /**
   * Логирует транзакцию в базу данных
   * @param transaction Данные транзакции для сохранения
   * @returns Созданная транзакция
   */
  static async logTransaction(transaction: CreateTransactionParams): Promise<any> {
    try {
      // Проверяем наличие обязательных полей
      if (!transaction.userId || !transaction.type || !transaction.amount || !transaction.currency || !transaction.status) {
        throw new Error('Отсутствуют обязательные поля транзакции');
      }

      // Создаем запись транзакции
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          user_id: transaction.userId,
          type: transaction.type,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          wallet_address: transaction.walletAddress || null,
          source: transaction.source || null,
          description: transaction.description || null,
          category: transaction.category || null,
          tx_hash: transaction.txHash || null,
          created_at: sql`CURRENT_TIMESTAMP`
        })
        .returning();

      console.log(`[Transaction] ${transaction.type} | Amount: ${transaction.amount} ${transaction.currency} | User: ${transaction.userId} | Saved`);
      
      return newTransaction;
    } catch (error) {
      console.error(`[TransactionService] Ошибка при логировании транзакции:`, error);
      throw error;
    }
  }
}