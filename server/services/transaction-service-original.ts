/**
 * Сервис для работы с транзакциями (оригинальная реализация)
 * 
 * Этот файл содержит основную реализацию сервиса транзакций,
 * которая будет реэкспортироваться через прокси-файлы
 */

import { db } from '../db';
import { IExtendedStorage } from '../storage-interface';
import { 
  transactions, 
  Transaction, 
  InsertTransaction,
  users
} from '@shared/schema';
import { eq, sql, desc, and, or } from 'drizzle-orm';

/**
 * Типы транзакций в системе
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  FARMING = 'farming',
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
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Категории транзакций
 */
export enum TransactionCategory {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  REWARD = 'reward',
  BONUS = 'bonus',
  REFERRAL = 'referral',
  FARMING = 'farming',
  AIRDROP = 'airdrop',
  TRANSFER = 'transfer'
}

/**
 * Интерфейс сервиса транзакций
 */
export interface ITransactionService {
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  updateTransactionStatus(id: number, status: TransactionStatus): Promise<Transaction | undefined>;
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
    }
  };
}

/**
 * Тип сервиса транзакций
 * Используется для аннотации импортов из этого модуля
 */
export type TransactionService = ReturnType<typeof createTransactionService>;

/**
 * Статический API для обратной совместимости с существующим кодом
 */
export const TransactionService = {
  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    try {
      const [transaction] = await db
        .insert(transactions)
        .values(data)
        .returning();
      
      return transaction;
    } catch (error) {
      console.error('[TransactionService] Static error in createTransaction:', error);
      throw error;
    }
  },
  
  async getTransactionById(id: number): Promise<Transaction | undefined> {
    try {
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
      
      return transaction;
    } catch (error) {
      console.error('[TransactionService] Static error in getTransactionById:', error);
      return undefined;
    }
  },
  
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
      console.error('[TransactionService] Static error in getUserTransactions:', error);
      return [];
    }
  },
  
  async updateTransactionStatus(id: number, status: TransactionStatus): Promise<Transaction | undefined> {
    try {
      const [updatedTransaction] = await db
        .update(transactions)
        .set({ status })
        .where(eq(transactions.id, id))
        .returning();
      
      return updatedTransaction;
    } catch (error) {
      console.error('[TransactionService] Static error in updateTransactionStatus:', error);
      return undefined;
    }
  }
};