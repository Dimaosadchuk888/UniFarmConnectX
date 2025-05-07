/**
 * Инстанс-ориентированная имплементация сервиса для работы с транзакциями
 * 
 * Этот файл содержит основную реализацию сервиса транзакций,
 * который работает на базе конкретного инстанса
 */

import { db } from '../db';
import { IExtendedStorage } from '../storage-interface';
import { 
  transactions, 
  Transaction, 
  InsertTransaction
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Типы транзакций в системе
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  REFERRAL_BONUS = 'referral_bonus',
  FARMING_REWARD = 'farming_reward',
  SYSTEM = 'system'
}

/**
 * Валюты, поддерживаемые в системе
 */
export enum Currency {
  TON = 'TON',
  UNI = 'UNI'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Данные для создания транзакции
 */
export interface TransactionData {
  userId: number;
  type: string;
  currency: string;
  amount: string;
  status: string;
  source?: string;
  category?: string;
  tx_hash?: string | null;
  metadata?: any;
}

/**
 * Интерфейс сервиса транзакций
 */
export interface ITransactionService {
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: TransactionStatus): Promise<Transaction | undefined>;
  logTransaction(data: TransactionData): Promise<Transaction>;
}

/**
 * Фабрика для создания сервиса транзакций
 */
export function createTransactionService(storage: IExtendedStorage): ITransactionService {
  return {
    /**
     * Создает новую транзакцию
     */
    async createTransaction(data: InsertTransaction): Promise<Transaction> {
      try {
        const [transaction] = await db
          .insert(transactions)
          .values(data)
          .returning();
        
        return transaction;
      } catch (error) {
        console.error('[TransactionService] Error in createTransaction:', error);
        throw error;
      }
    },

    /**
     * Получает транзакцию по ID
     */
    async getTransactionById(id: number): Promise<Transaction | undefined> {
      try {
        const [transaction] = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, id));
        
        return transaction;
      } catch (error) {
        console.error('[TransactionService] Error in getTransactionById:', error);
        return undefined;
      }
    },

    /**
     * Получает транзакции пользователя
     */
    async getUserTransactions(userId: number, limit = 50): Promise<Transaction[]> {
      try {
        const userTransactions = await db
          .select()
          .from(transactions)
          .where(eq(transactions.user_id, userId))
          .orderBy(desc(transactions.created_at))
          .limit(limit);
        
        return userTransactions;
      } catch (error) {
        console.error('[TransactionService] Error in getUserTransactions:', error);
        return [];
      }
    },

    /**
     * Обновляет статус транзакции
     */
    async updateTransactionStatus(id: number, status: TransactionStatus): Promise<Transaction | undefined> {
      try {
        const [updatedTransaction] = await db
          .update(transactions)
          .set({ status })
          .where(eq(transactions.id, id))
          .returning();
        
        return updatedTransaction;
      } catch (error) {
        console.error('[TransactionService] Error in updateTransactionStatus:', error);
        return undefined;
      }
    },

    /**
     * Создает транзакцию из упрощенных данных
     * Используется для совместимости со старым кодом
     */
    async logTransaction(data: TransactionData): Promise<Transaction> {
      try {
        const transactionData: InsertTransaction = {
          user_id: data.userId,
          type: data.type,
          currency: data.currency,
          amount: data.amount,
          status: data.status,
          source: data.source,
          category: data.category,
          tx_hash: data.tx_hash || null
        };

        const [transaction] = await db
          .insert(transactions)
          .values(transactionData)
          .returning();
        
        return transaction;
      } catch (error) {
        console.error('[TransactionService] Error in logTransaction:', error);
        throw error;
      }
    }
  };
}