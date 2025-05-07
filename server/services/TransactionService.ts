/**
 * Сервис для работы с транзакциями
 * 
 * Обеспечивает бизнес-логику для операций с транзакциями, балансами и финансовыми операциями.
 */

import { IExtendedStorage, StorageErrors } from '../storage-interface';
import { Transaction, InsertTransaction, User } from '@shared/schema';

/**
 * Типы транзакций
 */
export enum TransactionType {
  DEPOSIT = 'deposit',         // Внесение средств
  WITHDRAW = 'withdraw',       // Вывод средств
  REWARD = 'reward',           // Награда
  BONUS = 'bonus',             // Бонус
  REFERRAL = 'referral',       // Реферальное вознаграждение
  FARMING = 'farming',         // Доход от фарминга
  AIRDROP = 'airdrop',         // Аирдроп
  TRANSFER = 'transfer'        // Перевод
}

/**
 * Валюты транзакций
 */
export enum Currency {
  UNI = 'UNI',
  TON = 'TON'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',         // В ожидании
  CONFIRMED = 'confirmed',     // Подтверждена
  REJECTED = 'rejected',       // Отклонена
  CANCELLED = 'cancelled',     // Отменена
  FAILED = 'failed'            // Не удалась
}

/**
 * Опции для создания транзакции
 */
export interface CreateTransactionOptions {
  userId: number;
  type: TransactionType | string;
  currency: Currency | string;
  amount: string;
  status?: TransactionStatus | string;
  source?: string;
  category?: string;
  txHash?: string;
  description?: string;
  sourceUserId?: number;
  walletAddress?: string;
  data?: any;
  updateBalance?: boolean;
}

/**
 * Сервис для работы с транзакциями
 */
export class TransactionService {
  constructor(private storage: IExtendedStorage) {}
  
  /**
   * Создание новой транзакции
   * @param options Опции для создания транзакции
   * @returns Promise<Transaction> Созданная транзакция
   */
  async createTransaction(options: CreateTransactionOptions): Promise<Transaction> {
    console.log(`[TransactionService] Создание транзакции:`, options);
    
    // Проверка пользователя
    const user = await this.storage.getUser(options.userId);
    if (!user) {
      throw StorageErrors.notFound('User', { id: options.userId });
    }
    
    // Валидация суммы
    const amount = options.amount;
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw StorageErrors.validation('Amount must be a positive number', { amount });
    }
    
    // Преобразуем опции в транзакцию
    const transaction: InsertTransaction = {
      user_id: options.userId,
      type: options.type,
      currency: options.currency,
      amount,
      status: options.status || TransactionStatus.CONFIRMED,
      source: options.source || undefined,
      category: options.category || undefined,
      tx_hash: options.txHash || undefined,
      description: options.description || undefined,
      source_user_id: options.sourceUserId || undefined,
      wallet_address: options.walletAddress || undefined,
      data: options.data ? JSON.stringify(options.data) : undefined
    };
    
    // Определяем, нужно ли обновить баланс
    const updateBalance = options.updateBalance !== undefined ? options.updateBalance : true;
    
    // Создаем транзакцию в одной транзакции с обновлением баланса
    return await this.storage.executeTransaction(async (tx) => {
      // Создаем транзакцию
      const createdTransaction = await this.storage.createTransaction(transaction);
      
      // Обновляем баланс пользователя, если требуется
      if (updateBalance && 
          (options.status === TransactionStatus.CONFIRMED || options.status === undefined) &&
          ['deposit', 'reward', 'bonus', 'referral', 'farming', 'airdrop'].includes(options.type)) {
        // Для входящих транзакций увеличиваем баланс
        await this.storage.updateUserBalance(
          options.userId,
          options.currency as Currency,
          amount
        );
      } else if (updateBalance && 
                options.type === TransactionType.WITHDRAW && 
                (options.status === TransactionStatus.CONFIRMED || options.status === undefined)) {
        // Для исходящих транзакций уменьшаем баланс
        // Отрицательная сумма для списания
        await this.storage.updateUserBalance(
          options.userId,
          options.currency as Currency,
          `-${amount}`
        );
      }
      
      return createdTransaction;
    });
  }
  
  /**
   * Получение транзакций пользователя
   * @param userId ID пользователя
   * @param limit Ограничение количества (по умолчанию 50)
   * @param offset Смещение (по умолчанию 0)
   * @returns Promise<{transactions: Transaction[], total: number}> Список транзакций и их общее количество
   */
  async getUserTransactions(userId: number, limit: number = 50, offset: number = 0): Promise<{transactions: Transaction[], total: number}> {
    console.log(`[TransactionService] Получение транзакций пользователя ${userId} (лимит: ${limit}, смещение: ${offset})`);
    
    // Проверка пользователя
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw StorageErrors.notFound('User', { id: userId });
    }
    
    return this.storage.getUserTransactions(userId, limit, offset);
  }
  
  /**
   * Пополнение баланса пользователя
   * @param userId ID пользователя
   * @param currency Валюта (UNI или TON)
   * @param amount Сумма пополнения
   * @param source Источник пополнения
   * @param description Описание операции
   * @returns Promise<{transaction: Transaction, user: User}> Созданная транзакция и обновленный пользователь
   */
  async depositFunds(
    userId: number, 
    currency: Currency, 
    amount: string, 
    source: string = 'manual', 
    description: string = 'Пополнение баланса'
  ): Promise<{transaction: Transaction, user: User}> {
    console.log(`[TransactionService] Пополнение баланса пользователя ${userId}: ${currency} ${amount}`);
    
    // Создаем транзакцию
    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.DEPOSIT,
      currency,
      amount,
      source,
      description,
      updateBalance: true
    });
    
    // Получаем обновленного пользователя
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw StorageErrors.notFound('User', { id: userId });
    }
    
    return { transaction, user };
  }
  
  /**
   * Списание средств с баланса пользователя
   * @param userId ID пользователя
   * @param currency Валюта (UNI или TON)
   * @param amount Сумма списания
   * @param walletAddress Адрес кошелька для вывода (необязательно)
   * @param description Описание операции
   * @returns Promise<{transaction: Transaction, user: User}> Созданная транзакция и обновленный пользователь
   */
  async withdrawFunds(
    userId: number, 
    currency: Currency, 
    amount: string, 
    walletAddress?: string, 
    description: string = 'Вывод средств'
  ): Promise<{transaction: Transaction, user: User}> {
    console.log(`[TransactionService] Вывод средств пользователя ${userId}: ${currency} ${amount}`);
    
    // Проверка пользователя и баланса
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw StorageErrors.notFound('User', { id: userId });
    }
    
    // Проверка достаточности средств
    const balance = currency === Currency.UNI ? user.balance_uni : user.balance_ton;
    if (parseFloat(balance) < parseFloat(amount)) {
      throw StorageErrors.validation('Insufficient funds', { 
        required: amount, 
        available: balance 
      });
    }
    
    // Создаем транзакцию
    const transaction = await this.createTransaction({
      userId,
      type: TransactionType.WITHDRAW,
      currency,
      amount,
      walletAddress,
      description,
      updateBalance: true
    });
    
    // Получаем обновленного пользователя
    const updatedUser = await this.storage.getUser(userId);
    if (!updatedUser) {
      throw StorageErrors.notFound('User', { id: userId });
    }
    
    return { transaction, user: updatedUser };
  }
}

// Экспортируем фабричную функцию для создания экземпляра сервиса
export function createTransactionService(storage: IExtendedStorage): TransactionService {
  return new TransactionService(storage);
}