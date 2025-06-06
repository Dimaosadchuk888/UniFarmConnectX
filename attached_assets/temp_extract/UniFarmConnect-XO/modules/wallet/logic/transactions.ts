/**
 * Серверная логика для работы с транзакциями
 */

import { TransactionType, TransactionStatus } from '../model';

/**
 * Интерфейс для транзакции
 */
export interface Transaction {
  id: string | number;
  type: TransactionType;
  amount: number;
  tokenType: string;
  timestamp: Date;
  status: TransactionStatus;
  source?: string;
  category?: string;
  title?: string;
  description?: string;
}

/**
 * Логика создания транзакции
 */
export class TransactionLogic {
  /**
   * Создание новой транзакции
   */
  static async createTransaction(
    userId: number,
    type: TransactionType,
    amount: string,
    tokenType: string,
    description?: string
  ): Promise<boolean> {
    try {
      console.log('[TransactionLogic] Создание транзакции:', {
        userId,
        type,
        amount,
        tokenType
      });

      // Здесь будет логика создания транзакции через Drizzle ORM
      return true;
    } catch (error) {
      console.error('[TransactionLogic] Ошибка создания транзакции:', error);
      throw error;
    }
  }

  /**
   * Получение истории транзакций пользователя
   */
  static async getUserTransactions(
    userId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      console.log('[TransactionLogic] Получение транзакций пользователя:', userId);

      // Здесь будет логика получения транзакций из базы данных
      return [];
    } catch (error) {
      console.error('[TransactionLogic] Ошибка получения транзакций:', error);
      throw error;
    }
  }

  /**
   * Валидация параметров транзакции
   */
  static validateTransaction(
    type: TransactionType,
    amount: string,
    tokenType: string
  ): { valid: boolean; error?: string } {
    try {
      if (!type || !amount || !tokenType) {
        return { valid: false, error: 'Не все обязательные поля заполнены' };
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return { valid: false, error: 'Некорректная сумма транзакции' };
      }

      return { valid: true };
    } catch (error) {
      console.error('[TransactionLogic] Ошибка валидации:', error);
      return { valid: false, error: 'Ошибка валидации транзакции' };
    }
  }

  /**
   * Расчет комиссии за транзакцию
   */
  static calculateFee(amount: string, type: TransactionType): string {
    try {
      const amountNum = parseFloat(amount);
      
      // Базовые комиссии
      const feeRates = {
        [TransactionType.WITHDRAWAL]: 0.01, // 1% за вывод
        [TransactionType.DEPOSIT]: 0, // Без комиссии за пополнение
        [TransactionType.REFERRAL_REWARD]: 0, // Без комиссии за реферальные награды
        [TransactionType.FARMING_REWARD]: 0, // Без комиссии за фарминг
        [TransactionType.DAILY_BONUS]: 0 // Без комиссии за бонусы
      };

      const rate = feeRates[type] || 0;
      const fee = amountNum * rate;
      
      return fee.toFixed(8);
    } catch (error) {
      console.error('[TransactionLogic] Ошибка расчета комиссии:', error);
      return '0';
    }
  }

  /**
   * Обновление статуса транзакции
   */
  static async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus
  ): Promise<boolean> {
    try {
      console.log('[TransactionLogic] Обновление статуса транзакции:', {
        transactionId,
        status
      });

      // Здесь будет логика обновления статуса в базе данных
      return true;
    } catch (error) {
      console.error('[TransactionLogic] Ошибка обновления статуса:', error);
      throw error;
    }
  }
}

/**
 * Получение отформатированного названия типа транзакции
 */
export function getTransactionTitle(type: TransactionType): string {
  const titles = {
    [TransactionType.DEPOSIT]: 'Пополнение',
    [TransactionType.WITHDRAWAL]: 'Вывод средств',
    [TransactionType.REFERRAL_REWARD]: 'Реферальная награда',
    [TransactionType.FARMING_REWARD]: 'Доход с фарминга',
    [TransactionType.DAILY_BONUS]: 'Ежедневный бонус'
  };

  return titles[type] || 'Другая операция';
}

/**
 * Получение категории транзакции
 */
export function getTransactionCategory(type: TransactionType): string {
  const categories = {
    [TransactionType.DEPOSIT]: 'deposit',
    [TransactionType.WITHDRAWAL]: 'withdrawal',
    [TransactionType.REFERRAL_REWARD]: 'referral',
    [TransactionType.FARMING_REWARD]: 'farming',
    [TransactionType.DAILY_BONUS]: 'bonus'
  };

  return categories[type] || 'other';
}