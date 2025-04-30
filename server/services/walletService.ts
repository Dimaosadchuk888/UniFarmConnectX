import { db } from '../db';
import { users, transactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { InsufficientFundsError, NotFoundError } from '../middleware/errorHandler';
import type { User } from '@shared/schema';

/**
 * Сервис для работы с кошельком пользователя
 * Обеспечивает манипуляции с балансом и транзакциями
 */
export class WalletService {
  /**
   * Получить баланс пользователя
   * 
   * @param userId ID пользователя
   * @returns Объект с балансами UNI и TON
   * @throws NotFoundError если пользователь не найден
   */
  async getUserBalance(userId: number): Promise<{ balance_uni: string; balance_ton: string }> {
    const user = await db.select({
      balance_uni: users.balance_uni,
      balance_ton: users.balance_ton
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return user[0];
  }
  
  /**
   * Обновляет баланс пользователя
   * 
   * @param userId ID пользователя
   * @param amount Сумма для изменения баланса (может быть отрицательной)
   * @param currency Валюта (uni или ton)
   * @param transactionType Тип транзакции
   * @returns Обновленный баланс пользователя
   * @throws NotFoundError если пользователь не найден
   * @throws InsufficientFundsError если недостаточно средств для снятия
   */
  async updateBalance(
    userId: number,
    amount: number, 
    currency: 'uni' | 'ton',
    transactionType: string
  ): Promise<{ newBalance: string; transactionId: number }> {
    // Получаем пользователя с текущим балансом
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    const currentUser = user[0];
    const balanceField = currency === 'uni' ? 'balance_uni' : 'balance_ton';
    const currentBalance = parseFloat(currentUser[balanceField as keyof User] as string);
    
    // Если это снятие средств (отрицательная сумма), проверяем достаточность баланса
    if (amount < 0 && Math.abs(amount) > currentBalance) {
      throw new InsufficientFundsError(
        'Недостаточно средств для операции',
        currentBalance,
        currency.toUpperCase()
      );
    }
    
    // Вычисляем новый баланс
    const newBalance = (currentBalance + amount).toFixed(6);
    
    // Начало транзакции для атомарного обновления баланса и записи транзакции
    return await db.transaction(async (tx) => {
      // Обновляем баланс пользователя
      await tx
        .update(users)
        .set({ [balanceField]: newBalance })
        .where(eq(users.id, userId));
      
      // Записываем транзакцию
      const [transaction] = await tx
        .insert(transactions)
        .values({
          user_id: userId,
          type: transactionType,
          amount: amount.toString(),
          currency: currency.toUpperCase(),
          created_at: sql`CURRENT_TIMESTAMP`
        })
        .returning({ id: transactions.id });
      
      return {
        newBalance,
        transactionId: transaction.id
      };
    });
  }
}