import { db } from '../../server/db';
import { users, transactions } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export class WalletService {
  async getBalance(userId: string): Promise<{ uni: string; ton: string }> {
    try {
      const [user] = await db
        .select({
          balance_uni: users.balance_uni,
          balance_ton: users.balance_ton
        })
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);
      
      return {
        uni: user?.balance_uni || "0",
        ton: user?.balance_ton || "0"
      };
    } catch (error) {
      console.error('[WalletService] Ошибка получения баланса:', error);
      throw error;
    }
  }

  async updateBalance(userId: string, type: 'uni' | 'ton', amount: string): Promise<boolean> {
    try {
      const updateData = type === 'uni' 
        ? { balance_uni: amount }
        : { balance_ton: amount };
      
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(userId)))
        .returning();
      
      return !!updatedUser;
    } catch (error) {
      console.error('[WalletService] Ошибка обновления баланса:', error);
      throw error;
    }
  }

  async createTransaction(data: {
    userId: string;
    type: string;
    currency: string;
    amount: string;
    description?: string;
  }): Promise<any> {
    try {
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          user_id: parseInt(data.userId),
          type: data.type,
          currency: data.currency,
          amount: data.amount,
          description: data.description || '',
          status: 'confirmed'
        })
        .returning();
      
      return newTransaction;
    } catch (error) {
      console.error('[WalletService] Ошибка создания транзакции:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const offset = (page - 1) * limit;
      
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.user_id, parseInt(userId)))
        .orderBy(desc(transactions.created_at))
        .limit(limit)
        .offset(offset);
      
      return {
        transactions: userTransactions,
        pagination: {
          page,
          limit,
          total: userTransactions.length,
          has_more: userTransactions.length === limit
        }
      };
    } catch (error) {
      console.error('[WalletService] Ошибка получения истории транзакций:', error);
      throw error;
    }
  }

  async validateTransaction(transactionId: string): Promise<boolean> {
    try {
      console.log(`[WalletService] Валидация транзакции ${transactionId}`);
      
      // Здесь будет логика валидации транзакции
      return true;
    } catch (error) {
      console.error('[WalletService] Ошибка валидации транзакции:', error);
      throw error;
    }
  }

  async processWithdrawal(userId: string, amount: string, type: 'uni' | 'ton'): Promise<boolean> {
    // Логика обработки вывода средств
    return false;
  }
}