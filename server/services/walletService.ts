import { db } from '../db';
import { users, transactions, tonBoostDeposits, type User, type Transaction } from '@shared/schema';
import { eq, sql, desc, and, SQL, or, asc } from 'drizzle-orm';
import { InsufficientFundsError, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { TransactionService, TransactionType, Currency, TransactionStatus, TransactionCategory } from './transactionService';

/**
 * Типы валют для операций с балансом
 */
export enum WalletCurrency {
  UNI = 'UNI',
  TON = 'TON'
}

/**
 * Типы операций с балансом
 */
export enum BalanceOperationType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  REWARD = 'reward',
  BONUS = 'bonus'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatusType {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

/**
 * Параметры для получения транзакций пользователя
 */
export interface GetTransactionsParams {
  userId: number;
  limit?: number;
  offset?: number;
  currency?: WalletCurrency;
  status?: TransactionStatusType;
}

/**
 * Интерфейс для запроса вывода средств
 */
export interface WithdrawRequest {
  userId: number;
  amount: string | number;
  currency: WalletCurrency;
  walletAddress?: string;
}

/**
 * Интерфейс для запроса пополнения средств
 */
export interface DepositRequest {
  userId: number;
  amount: string | number;
  currency: WalletCurrency;
  source?: string;
  category?: string;
  walletAddress?: string;
}

/**
 * Интерфейс для привязки кошелька
 */
export interface WalletBindRequest {
  userId: number;
  walletAddress: string;
}

/**
 * Результат операции с кошельком
 */
export interface WalletOperationResult {
  success: boolean;
  userId: number;
  transactionId?: number;
  newBalance?: string;
  message?: string;
  walletAddress?: string | null;
}

/**
 * Информация о кошельке пользователя
 */
export interface WalletInfo {
  userId: number;
  balanceUni: string;
  balanceTon: string;
  walletAddress: string | null;
}

/**
 * Результат валидации TON-адреса
 */
export interface AddressValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Транзакция пользователя
 */
export interface UserTransaction {
  id: number;
  userId: number;
  type: string;
  amount: string;
  currency: string;
  createdAt: Date;
  status: string;
  walletAddress: string | null;
  source?: string;
  category?: string;
  txHash?: string;
}

/**
 * Сервис для работы с кошельком пользователя
 * Обеспечивает все операции с балансом и транзакциями пользователей
 * в соответствии с принципами SOLID
 */
export class WalletService {
  /**
   * Получает информацию о кошельке пользователя
   * @param userId ID пользователя
   * @returns Полная информация о кошельке пользователя
   * @throws NotFoundError если пользователь не найден
   */
  async getWalletInfo(userId: number): Promise<WalletInfo> {
    try {
      const user = await this.getUserById(userId);
      
      return {
        userId: user.id,
        balanceUni: String(user.balance_uni || '0.000000'),
        balanceTon: String(user.balance_ton || '0.000000'),
        walletAddress: user.ton_wallet_address
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при получении информации о кошельке пользователя ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получает адрес TON-кошелька пользователя
   * @param userId ID пользователя
   * @returns Объект с ID пользователя и адресом кошелька
   * @throws NotFoundError если пользователь не найден
   */
  async getWalletAddress(userId: number): Promise<{ userId: number; walletAddress: string | null }> {
    try {
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
        userId: user[0].id,
        walletAddress: user[0].ton_wallet_address
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при получении адреса кошелька пользователя ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Проверяет уникальность адреса TON-кошелька
   * @param walletAddress Адрес TON-кошелька для проверки
   * @param currentUserId ID текущего пользователя (исключается из проверки)
   * @returns true, если адрес уникален или принадлежит currentUserId
   * @throws ValidationError если адрес уже привязан к другому пользователю
   */
  async checkWalletAddressAvailability(walletAddress: string, currentUserId: number): Promise<boolean> {
    try {
      const existingUser = await db.select({
        id: users.id
      })
      .from(users)
      .where(eq(users.ton_wallet_address, walletAddress))
      .limit(1);
      
      if (existingUser[0] && existingUser[0].id !== currentUserId) {
        throw new ValidationError(`Адрес ${walletAddress} уже привязан к другому пользователю`);
      }
      
      return true;
    } catch (error) {
      console.error(`[WalletService] Ошибка при проверке доступности адреса кошелька ${walletAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Обновляет адрес TON-кошелька пользователя
   * @param userId ID пользователя
   * @param walletAddress Новый адрес TON-кошелька
   * @returns Обновленная информация о пользователе
   * @throws NotFoundError если пользователь не найден
   * @throws ValidationError если адрес недопустим
   */
  async updateWalletAddress(userId: number, walletAddress: string): Promise<{ userId: number; walletAddress: string }> {
    try {
      // Проверка формата адреса
      const validation = this.validateTonAddress(walletAddress);
      if (!validation.isValid) {
        throw new ValidationError(validation.message || 'Некорректный формат TON-адреса');
      }
      
      // Проверка уникальности адреса
      await this.checkWalletAddressAvailability(walletAddress, userId);
      
      // Обновление адреса кошелька
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
        userId: updatedUser.id,
        walletAddress: updatedUser.ton_wallet_address as string
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при обновлении адреса кошелька пользователя ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Получает баланс пользователя
   * @param userId ID пользователя
   * @returns Объект с балансами UNI и TON
   * @throws NotFoundError если пользователь не найден
   */
  async getUserBalance(userId: number): Promise<{ balanceUni: string; balanceTon: string }> {
    try {
      const user = await this.getUserById(userId);
      
      return {
        balanceUni: String(user.balance_uni || '0.000000'),
        balanceTon: String(user.balance_ton || '0.000000')
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при получении баланса пользователя ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Обновляет баланс пользователя
   * @param userId ID пользователя
   * @param amount Сумма для изменения баланса (может быть отрицательной)
   * @param currency Валюта (UNI или TON)
   * @param transactionType Тип транзакции
   * @param params Дополнительные параметры транзакции
   * @returns Обновленный баланс пользователя
   * @throws NotFoundError если пользователь не найден
   * @throws InsufficientFundsError если недостаточно средств для снятия
   */
  async updateBalance(
    userId: number,
    amount: number, 
    currency: WalletCurrency,
    transactionType: string,
    params: {
      walletAddress?: string | null;
      source?: string;
      category?: string;
      txHash?: string;
      status?: TransactionStatusType;
    } = {}
  ): Promise<{ newBalance: string; transactionId: number }> {
    try {
      // Получаем пользователя с текущим балансом
      const user = await this.getUserById(userId);
      
      // Определяем поле баланса и текущий баланс
      const formattedCurrency = currency.toLowerCase();
      const balanceField = formattedCurrency === 'uni' ? 'balance_uni' : 'balance_ton';
      const currentBalance = parseFloat(user[balanceField as keyof User] as string || '0');
      
      // Если это снятие средств (отрицательная сумма), проверяем достаточность баланса
      if (amount < 0 && Math.abs(amount) > currentBalance) {
        throw new InsufficientFundsError(
          'Недостаточно средств для операции',
          currentBalance,
          currency
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
        
        // Записываем транзакцию с полным набором полей
        const [transaction] = await tx
          .insert(transactions)
          .values({
            user_id: userId,
            type: transactionType,
            amount: amount.toString(),
            currency: currency,
            created_at: sql`CURRENT_TIMESTAMP`,
            status: params.status || TransactionStatusType.CONFIRMED,
            wallet_address: params.walletAddress || null,
            source: params.source || null,
            category: params.category || null,
            tx_hash: params.txHash || null
          })
          .returning({ id: transactions.id });
        
        return {
          newBalance,
          transactionId: transaction.id
        };
      });
    } catch (error) {
      console.error(`[WalletService] Ошибка при обновлении баланса пользователя ${userId}:`, error);
      throw error;
    }
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
   * Регистрирует депозит средств
   * @param request Параметры пополнения
   * @returns Результат операции пополнения
   */
  async depositFunds(request: DepositRequest): Promise<WalletOperationResult> {
    try {
      const { userId, amount, currency, source, category, walletAddress } = request;
      
      // Проверка существования пользователя
      await this.getUserById(userId);
      
      // Преобразование суммы к числу
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new ValidationError(`Некорректная сумма для пополнения: ${amount}`);
      }
      
      // Если передан адрес кошелька, проверяем его формат (для TON)
      if (walletAddress && currency === WalletCurrency.TON) {
        const addressValidation = this.validateTonAddress(walletAddress);
        if (!addressValidation.isValid) {
          throw new ValidationError(addressValidation.message || 'Некорректный формат TON-адреса');
        }
      }
      
      // Обновляем баланс (увеличиваем на сумму депозита)
      const result = await this.updateBalance(
        userId,
        numericAmount,
        currency,
        TransactionType.DEPOSIT,
        {
          walletAddress,
          source: source || 'user_deposit',
          category: category || TransactionCategory.DEPOSIT,
          status: TransactionStatusType.CONFIRMED
        }
      );
      
      return {
        success: true,
        userId,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
        message: `Пополнение ${numericAmount} ${currency} успешно выполнено`,
        walletAddress
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при пополнении средств:`, error);
      throw error;
    }
  }

  /**
   * Выводит средства с кошелька пользователя
   * @param request Параметры вывода средств
   * @returns Результат операции вывода
   */
  async withdrawFunds(request: WithdrawRequest): Promise<WalletOperationResult> {
    try {
      const { userId, amount, currency, walletAddress } = request;
      
      // Получение пользователя и проверка существования
      const user = await this.getUserById(userId);
      
      // Преобразование суммы к числу
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new ValidationError(`Некорректная сумма для вывода: ${amount}`);
      }
      
      // Если это вывод TON, обязательно нужен адрес кошелька
      if (currency === WalletCurrency.TON && !walletAddress && !user.ton_wallet_address) {
        throw new ValidationError('Для вывода TON необходимо указать адрес кошелька');
      }
      
      // Используем указанный адрес или сохраненный адрес пользователя
      let withdrawAddress = walletAddress || user.ton_wallet_address;
      
      // Если передан адрес кошелька, проверяем его формат (для TON)
      if (withdrawAddress && currency === WalletCurrency.TON) {
        const addressValidation = this.validateTonAddress(withdrawAddress);
        if (!addressValidation.isValid) {
          throw new ValidationError(addressValidation.message || 'Некорректный формат TON-адреса');
        }
      }
      
      // Обновляем баланс (уменьшаем на сумму вывода)
      const result = await this.updateBalance(
        userId,
        -numericAmount, // Отрицательное значение для вывода
        currency,
        TransactionType.WITHDRAW,
        {
          walletAddress: withdrawAddress,
          source: 'user_request',
          category: TransactionCategory.WITHDRAWAL,
          status: TransactionStatusType.PENDING // Вывод обычно требует подтверждения
        }
      );
      
      return {
        success: true,
        userId,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
        message: `Вывод ${numericAmount} ${currency} успешно инициирован`,
        walletAddress: withdrawAddress
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при выводе средств:`, error);
      throw error;
    }
  }
  
  /**
   * Подтверждает транзакцию вывода средств
   * @param transactionId ID транзакции для подтверждения
   * @param txHash Хеш транзакции в блокчейне (если есть)
   * @returns Обновленная транзакция
   */
  async confirmWithdrawal(transactionId: number, txHash?: string): Promise<UserTransaction> {
    try {
      // Получаем транзакцию
      const transaction = await this.getTransactionById(transactionId);
      
      if (!transaction) {
        throw new NotFoundError(`Транзакция с ID ${transactionId} не найдена`);
      }
      
      if (transaction.type !== TransactionType.WITHDRAW) {
        throw new ValidationError(`Транзакция с ID ${transactionId} не является выводом средств`);
      }
      
      if (transaction.status !== TransactionStatusType.PENDING) {
        throw new ValidationError(`Транзакция с ID ${transactionId} уже имеет статус ${transaction.status}`);
      }
      
      // Обновляем статус транзакции
      const [updatedTransaction] = await db
        .update(transactions)
        .set({ 
          status: TransactionStatusType.CONFIRMED,
          tx_hash: txHash || null
        })
        .where(eq(transactions.id, transactionId))
        .returning();
      
      return this.mapTransactionToUserTransaction(updatedTransaction);
    } catch (error) {
      console.error(`[WalletService] Ошибка при подтверждении вывода средств для транзакции ${transactionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Отклоняет транзакцию вывода средств и возвращает средства на баланс пользователя
   * @param transactionId ID транзакции для отклонения
   * @param reason Причина отклонения
   * @returns Обновленная транзакция и информация о возврате средств
   */
  async rejectWithdrawal(transactionId: number, reason: string): Promise<{ transaction: UserTransaction; refund: UserTransaction }> {
    try {
      // Получаем транзакцию
      const transaction = await this.getTransactionById(transactionId);
      
      if (!transaction) {
        throw new NotFoundError(`Транзакция с ID ${transactionId} не найдена`);
      }
      
      if (transaction.type !== TransactionType.WITHDRAW) {
        throw new ValidationError(`Транзакция с ID ${transactionId} не является выводом средств`);
      }
      
      if (transaction.status !== TransactionStatusType.PENDING) {
        throw new ValidationError(`Транзакция с ID ${transactionId} уже имеет статус ${transaction.status}`);
      }
      
      // Возвращаем средства пользователю и обновляем статус транзакции
      return await db.transaction(async (tx) => {
        // Обновляем статус транзакции
        const [updatedTransaction] = await tx
          .update(transactions)
          .set({ 
            status: TransactionStatusType.REJECTED,
            description: reason
          })
          .where(eq(transactions.id, transactionId))
          .returning();
        
        // Возвращаем средства на баланс пользователя
        const amount = Math.abs(parseFloat(updatedTransaction.amount));
        const currency = updatedTransaction.currency.toLowerCase() as 'uni' | 'ton';
        const balanceField = currency === 'uni' ? 'balance_uni' : 'balance_ton';
        
        // Получаем текущий баланс
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, updatedTransaction.user_id))
          .limit(1);
        
        const currentBalance = parseFloat(user[balanceField as keyof User] as string || '0');
        const newBalance = (currentBalance + amount).toFixed(6);
        
        // Обновляем баланс
        await tx
          .update(users)
          .set({ [balanceField]: newBalance })
          .where(eq(users.id, updatedTransaction.user_id));
        
        // Создаем транзакцию возврата
        const [refundTransaction] = await tx
          .insert(transactions)
          .values({
            user_id: updatedTransaction.user_id,
            type: 'refund',
            amount: amount.toString(),
            currency: updatedTransaction.currency,
            created_at: sql`CURRENT_TIMESTAMP`,
            status: TransactionStatusType.CONFIRMED,
            wallet_address: updatedTransaction.wallet_address,
            source: 'refund',
            category: 'refund',
            description: `Возврат средств за отклоненный вывод #${transactionId}: ${reason}`
          })
          .returning();
        
        return {
          transaction: this.mapTransactionToUserTransaction(updatedTransaction),
          refund: this.mapTransactionToUserTransaction(refundTransaction)
        };
      });
    } catch (error) {
      console.error(`[WalletService] Ошибка при отклонении вывода средств для транзакции ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * Получает транзакции пользователя с гибкой фильтрацией и пагинацией
   * @param params Параметры запроса транзакций
   * @returns Массив транзакций пользователя и общее количество
   */
  async getUserTransactions(params: GetTransactionsParams): Promise<{ transactions: UserTransaction[]; total: number }> {
    try {
      const { userId, limit = 20, offset = 0, currency, status } = params;
      
      // Проверяем существование пользователя
      await this.getUserById(userId);
      
      // Формируем условия для запроса
      const conditions: SQL[] = [eq(transactions.user_id, userId)];
      
      if (currency) {
        conditions.push(eq(transactions.currency, currency));
      }
      
      if (status) {
        conditions.push(eq(transactions.status, status));
      }
      
      // Объединяем условия через AND
      const whereCondition = conditions.length > 1 
        ? and(...conditions) 
        : conditions[0];
      
      // Получаем общее количество транзакций по фильтру
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(transactions)
        .where(whereCondition);
      
      // Получаем транзакции с пагинацией
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(whereCondition)
        .orderBy(desc(transactions.created_at))
        .limit(limit)
        .offset(offset);
      
      // Преобразуем записи из БД в интерфейс UserTransaction
      const mappedTransactions = userTransactions.map(tx => this.mapTransactionToUserTransaction(tx));
      
      return {
        transactions: mappedTransactions,
        total: Number(count)
      };
    } catch (error) {
      console.error(`[WalletService] Ошибка при получении транзакций пользователя ${params.userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Получает все транзакции TON-boost-депозитов для пользователя
   * @param userId ID пользователя
   * @returns Массив депозитов TON-boost и связанных с ними транзакций
   */
  async getUserTonBoostTransactions(userId: number): Promise<any[]> {
    try {
      // Проверяем существование пользователя
      await this.getUserById(userId);
      
      // Получаем все TON-boost-депозиты пользователя
      const deposits = await db
        .select()
        .from(tonBoostDeposits)
        .where(eq(tonBoostDeposits.user_id, userId))
        .orderBy(desc(tonBoostDeposits.created_at));
      
      // Получаем все транзакции связанные с TON-boost
      const boostTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.user_id, userId),
            or(
              eq(transactions.type, TransactionType.TON_BOOST),
              eq(transactions.source, 'ton_boost')
            )
          )
        )
        .orderBy(desc(transactions.created_at));
      
      // Связываем депозиты с транзакциями (можно расширить логику)
      return deposits.map(deposit => ({
        ...deposit,
        transactions: boostTransactions.filter(tx => 
          tx.description?.includes(`boost_id:${deposit.id}`) || 
          tx.data?.includes(`boost_id:${deposit.id}`)
        )
      }));
    } catch (error) {
      console.error(`[WalletService] Ошибка при получении TON-boost-транзакций пользователя ${userId}:`, error);
      throw error;
    }
  }

  // Вспомогательные методы

  /**
   * Получает пользователя по ID
   * @param userId ID пользователя
   * @returns Данные пользователя
   * @throws NotFoundError если пользователь не найден
   */
  private async getUserById(userId: number): Promise<User> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user[0]) {
      throw new NotFoundError(`Пользователь с ID ${userId} не найден`);
    }
    
    return user[0];
  }
  
  /**
   * Получает транзакцию по ID
   * @param transactionId ID транзакции
   * @returns Данные транзакции или null, если не найдена
   */
  private async getTransactionById(transactionId: number): Promise<Transaction | null> {
    const transaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);
    
    return transaction[0] || null;
  }
  
  /**
   * Преобразует запись транзакции из БД в формат UserTransaction
   * @param tx Запись транзакции из БД
   * @returns Объект в формате UserTransaction
   */
  private mapTransactionToUserTransaction(tx: Transaction): UserTransaction {
    return {
      id: tx.id,
      userId: tx.user_id,
      type: tx.type || 'unknown',
      amount: tx.amount || '0',
      currency: tx.currency || 'UNI',
      createdAt: tx.created_at || new Date(),
      status: tx.status || 'unknown',
      walletAddress: tx.wallet_address || null,
      source: tx.source || undefined,
      category: tx.category || undefined,
      txHash: tx.tx_hash || undefined
    };
  }
}