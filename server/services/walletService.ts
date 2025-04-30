import { db } from '../db';
import { users, transactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { InsufficientFundsError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import type { User } from '@shared/schema';

/**
 * Сервис для работы с кошельком пользователя
 * Обеспечивает манипуляции с балансом и транзакциями
 */
export class WalletService {
  /**
   * Получает адрес TON-кошелька пользователя
   * 
   * @param userId ID пользователя
   * @returns Объект с ID пользователя и адресом кошелька
   * @throws NotFoundError если пользователь не найден
   */
  async getWalletAddress(userId: number): Promise<{ user_id: number; wallet_address: string | null }> {
    const user = await db.select({
      id: users.id,
      ton_wallet_address: users.ton_wallet_address
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return {
      user_id: user[0].id,
      wallet_address: user[0].ton_wallet_address
    };
  }
  
  /**
   * Проверяет, не привязан ли указанный адрес кошелька к другому пользователю
   * 
   * @param walletAddress Адрес TON-кошелька для проверки
   * @param currentUserId ID текущего пользователя (если есть привязка к этому пользователю, то ошибки не будет)
   * @throws ValidationError если адрес уже привязан к другому пользователю
   */
  async checkWalletAddressAvailability(walletAddress: string, currentUserId: number): Promise<void> {
    const existingUser = await db.select({
      id: users.id
    })
    .from(users)
    .where(eq(users.ton_wallet_address, walletAddress))
    .limit(1);
    
    if (existingUser[0] && existingUser[0].id !== currentUserId) {
      throw new ValidationError(`Адрес ${walletAddress} уже привязан к другому пользователю`);
    }
  }
  
  /**
   * Обновляет адрес TON-кошелька пользователя
   * 
   * @param userId ID пользователя
   * @param walletAddress Новый адрес TON-кошелька
   * @returns Обновленную информацию о пользователе
   * @throws NotFoundError если пользователь не найден
   */
  async updateWalletAddress(userId: number, walletAddress: string): Promise<{ user_id: number; wallet_address: string }> {
    // Сначала проверяем, что адрес еще не используется другим пользователем
    await this.checkWalletAddressAvailability(walletAddress, userId);
    
    // Обновляем адрес кошелька
    const [updatedUser] = await db
      .update(users)
      .set({ ton_wallet_address: walletAddress })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        ton_wallet_address: users.ton_wallet_address
      });
    
    if (!updatedUser) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return {
      user_id: updatedUser.id,
      wallet_address: updatedUser.ton_wallet_address as string
    };
  }
  /**
   * Получить баланс пользователя
   * 
   * @param userId ID пользователя
   * @returns Объект с балансами UNI и TON
   * @throws NotFoundError если пользователь не найден
   */
  async getUserBalance(userId: number): Promise<{ balance_uni: string; balance_ton: string }> {
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return {
      balance_uni: String(user[0].balance_uni || '0.000000'),
      balance_ton: String(user[0].balance_ton || '0.000000')
    };
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