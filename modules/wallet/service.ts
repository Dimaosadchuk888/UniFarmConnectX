import { db } from '../../server/db.js';
import { transactions, users, type Transaction } from '../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';
import { UserRepository } from '../../core/repositories/UserRepository.js';

export class WalletService {
  async getWalletDataByTelegramId(telegramId: string): Promise<{
    uni_balance: number;
    ton_balance: number;
    total_earned: number;
    total_spent: number;
    transactions: any[];
  }> {
    try {
      const user = await UserRepository.findByTelegramId(telegramId);

      if (!user) {
        return {
          uni_balance: 0,
          ton_balance: 0,
          total_earned: 0,
          total_spent: 0,
          transactions: []
        };
      }

      // Получаем последние транзакции пользователя
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.user_id, user.id))
        .orderBy(desc(transactions.created_at))
        .limit(10);

      return {
        uni_balance: parseFloat(user.balance_uni || "0"),
        ton_balance: parseFloat(user.balance_ton || "0"),
        total_earned: 0, // Можно вычислить из транзакций
        total_spent: 0,  // Можно вычислить из транзакций
        transactions: userTransactions.map(tx => ({
          id: tx.id,
          type: tx.transaction_type,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          description: tx.description || '',
          date: tx.created_at,
          status: tx.status
        }))
      };
    } catch (error) {
      console.error('[WalletService] Ошибка получения данных кошелька по Telegram ID:', error);
      throw error;
    }
  }

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

  /**
   * АВТОМАТИЧЕСКОЕ НАЧИСЛЕНИЕ UNI ФАРМИНГ ДОХОДА
   * Напрямую увеличивает баланс без промежуточных таблиц
   */
  async addUniFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      console.log(`[WalletService] Автоматическое начисление UNI дохода для пользователя ${userId}: ${amount}`);
      
      // Получаем текущий баланс
      const currentBalance = await this.getBalance(userId);
      const newBalance = (parseFloat(currentBalance.uni) + parseFloat(amount)).toFixed(8);
      
      // Обновляем баланс напрямую
      const success = await this.updateBalance(userId, 'uni', newBalance);
      
      if (success) {
        // Записываем транзакцию для истории
        await this.createTransaction({
          userId,
          type: 'farming_income',
          currency: 'UNI',
          amount,
          description: 'Автоматическое начисление фарминг дохода'
        });
        
        console.log(`[WalletService] ✅ UNI доход ${amount} успешно зачислен на баланс`);
      }
      
      return success;
    } catch (error) {
      console.error('[WalletService] Ошибка автоматического начисления UNI дохода:', error);
      return false;
    }
  }

  /**
   * АВТОМАТИЧЕСКОЕ НАЧИСЛЕНИЕ TON ФАРМИНГ ДОХОДА
   * Напрямую увеличивает баланс без промежуточных таблиц
   */
  async addTonFarmIncome(userId: string, amount: string): Promise<boolean> {
    try {
      console.log(`[WalletService] Автоматическое начисление TON дохода для пользователя ${userId}: ${amount}`);
      
      // Получаем текущий баланс
      const currentBalance = await this.getBalance(userId);
      const newBalance = (parseFloat(currentBalance.ton) + parseFloat(amount)).toFixed(8);
      
      // Обновляем баланс напрямую
      const success = await this.updateBalance(userId, 'ton', newBalance);
      
      if (success) {
        // Записываем транзакцию для истории
        await this.createTransaction({
          userId,
          type: 'farming_income',
          currency: 'TON',
          amount,
          description: 'Автоматическое начисление фарминг дохода'
        });
        
        console.log(`[WalletService] ✅ TON доход ${amount} успешно зачислен на баланс`);
      }
      
      return success;
    } catch (error) {
      console.error('[WalletService] Ошибка автоматического начисления TON дохода:', error);
      return false;
    }
  }

  async createTransaction(data: {
    userId: string;
    type: string;
    currency: string;
    amount: string;
    description?: string;
  }): Promise<Transaction> {
    try {
      const [newTransaction] = await db
        .insert(transactions)
        .values({
          user_id: parseInt(data.userId),
          transaction_type: data.type,
          currency: data.currency,
          amount: data.amount,
          description: data.description || '',
          status: 'confirmed'
        } as any)
        .returning();
      
      return newTransaction;
    } catch (error) {
      console.error('[WalletService] Ошибка создания транзакции:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId: string, page: number = 1, limit: number = 20): Promise<{transactions: Transaction[], total: number, hasMore: boolean}> {
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
        total: userTransactions.length,
        hasMore: userTransactions.length === limit
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