import { db } from '../db';
import { users, transactions } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { InsufficientFundsError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import type { User } from '@shared/schema';

/**
 * Интерфейс для запроса вывода средств
 */
export interface WithdrawRequest {
  user_id: number;
  amount: string;
  currency: 'UNI' | 'TON';
  wallet_address?: string;
}

/**
 * Интерфейс для запроса привязки кошелька
 */
export interface WalletBindRequest {
  user_id: number;
  wallet_address: string;
}

/**
 * Результат операции с кошельком
 */
export interface WalletOperationResult {
  success: boolean;
  message?: string;
  transaction_id?: number;
  new_balance?: string;
  wallet_address?: string | null;
  user_id: number;
}

/**
 * Транзакция пользователя
 */
export interface UserTransaction {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency: string;
  created_at: Date;
  status?: string;
  wallet_address?: string | null;
}

/**
 * Результат валидации TON-адреса
 */
export interface AddressValidationResult {
  isValid: boolean;
  message?: string;
}

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
    transactionType: string,
    walletAddress?: string | null
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
      
      // Записываем транзакцию (временно без wallet_address)
      const [transaction] = await tx
        .insert(transactions)
        .values({
          user_id: userId,
          type: transactionType,
          amount: amount.toString(),
          currency: currency.toUpperCase(),
          created_at: sql`CURRENT_TIMESTAMP`,
          // Временно комментируем до проведения миграции БД
          // wallet_address: walletAddress || null
        })
        .returning({ id: transactions.id });
      
      return {
        newBalance,
        transactionId: transaction.id
      };
    });
  }

  /**
   * Проверяет формат TON-адреса
   * @param address Адрес TON-кошелька
   * @returns Результат проверки с флагом и сообщением
   */
  validateTonAddress(address: string): AddressValidationResult {
    // Базовая валидация TON-адреса (UQ... или EQ... форматы)
    const tonAddressRegex = /^(?:UQ|EQ)[A-Za-z0-9_-]{46,48}$/;
    const isValid = tonAddressRegex.test(address);
    
    return {
      isValid,
      message: isValid ? undefined : 'Некорректный формат TON-адреса'
    };
  }

  /**
   * Выводит средства с кошелька пользователя
   * @param request Параметры вывода средств
   * @returns Результат операции вывода
   */
  async withdrawFunds(request: WithdrawRequest): Promise<WalletOperationResult> {
    const { user_id, amount, currency, wallet_address } = request;
    
    // Проверяем, что пользователь существует
    const user = await db.select()
      .from(users)
      .where(eq(users.id, user_id))
      .limit(1);
      
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${user_id} не найден`);
    }
    
    // Преобразуем строковую сумму в число для сравнений и расчетов
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new ValidationError(`Некорректная сумма для вывода: ${amount}`);
    }
    
    // Если это вывод TON, обязательно нужен адрес кошелька
    if (currency === 'TON' && !wallet_address) {
      throw new ValidationError('Для вывода TON необходимо указать адрес кошелька');
    }
    
    // Если передан адрес кошелька, проверяем его формат
    if (wallet_address) {
      const addressValidation = this.validateTonAddress(wallet_address);
      if (!addressValidation.isValid) {
        throw new ValidationError(addressValidation.message || 'Некорректный формат адреса TON-кошелька');
      }
    }
    
    // Для вывода TON используем сохраненный адрес кошелька, если не указан другой
    let withdrawAddress = wallet_address;
    if (currency === 'TON' && !withdrawAddress) {
      // Используем привязанный адрес
      if (!user[0].ton_wallet_address) {
        throw new ValidationError('У пользователя не привязан TON-кошелек для вывода');
      }
      withdrawAddress = user[0].ton_wallet_address;
    }
    
    try {
      // Обновляем баланс (уменьшаем на сумму вывода)
      // Отрицательное значение, так как это снятие средств
      const result = await this.updateBalance(
        user_id,
        -numericAmount,
        currency.toLowerCase() as 'uni' | 'ton',
        'withdraw',
        withdrawAddress
      );
      
      return {
        success: true,
        user_id,
        transaction_id: result.transactionId,
        new_balance: result.newBalance,
        message: `Вывод ${amount} ${currency} успешно инициирован`,
        wallet_address: withdrawAddress
      };
    } catch (error) {
      if (error instanceof InsufficientFundsError) {
        throw error; // Просто передаем ошибку дальше
      }
      throw new Error(`Ошибка при выводе средств: ${(error as Error).message}`);
    }
  }

  /**
   * Получает историю транзакций пользователя
   * @param userId ID пользователя
   * @param limit Максимальное количество записей (по умолчанию 20)
   * @returns Массив транзакций пользователя
   */
  async getUserTransactions(userId: number, limit: number = 20): Promise<UserTransaction[]> {
    // Проверяем, что пользователь существует
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
      
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    // Получаем историю транзакций пользователя
    const userTransactions = await db.select({
      id: transactions.id,
      user_id: transactions.user_id,
      type: transactions.type,
      amount: transactions.amount,
      currency: transactions.currency,
      created_at: transactions.created_at,
      status: transactions.status,
      // Временно закомментировано до миграции БД
      // wallet_address: transactions.wallet_address
    })
    .from(transactions)
    .where(eq(transactions.user_id, userId))
    .orderBy(desc(transactions.created_at))
    .limit(limit);
    
    // Добавляем временную заглушку для wallet_address
    const transactionsWithWalletAddress = userTransactions.map(tx => ({
      ...tx,
      wallet_address: null
    }));
    
    return transactionsWithWalletAddress as UserTransaction[];
  }
}