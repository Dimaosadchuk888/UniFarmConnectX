import { db } from '../db';
import { transactions, Transaction, InsertTransaction } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Сервис для работы с транзакциями
 */
export class TransactionService {
  /**
   * Получает все транзакции пользователя
   * @param userId ID пользователя
   * @returns Массив транзакций пользователя
   */
  static async getUserTransactions(userId: number): Promise<Transaction[]> {
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .orderBy(sql`${transactions.created_at} DESC`);
    
    return userTransactions;
  }

  /**
   * Создает новую транзакцию
   * @param transactionData Данные транзакции
   * @returns Созданная транзакция
   */
  static async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    
    return transaction;
  }

  /**
   * Обновляет статус транзакции
   * @param transactionId ID транзакции
   * @param status Новый статус
   * @returns Обновленная транзакция
   */
  static async updateTransactionStatus(transactionId: number, status: string): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.id, transactionId))
      .returning();
    
    return updatedTransaction;
  }
}