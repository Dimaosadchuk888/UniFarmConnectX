import { db } from '../db';
import { transactions, insertTransactionSchema, type InsertTransaction } from '@shared/schema';
import { z } from 'zod';

/**
 * Типы транзакций
 */
export enum TransactionType {
  DEPOSIT = 'deposit',              // Пополнение баланса
  WITHDRAW = 'withdraw',            // Вывод средств
  REWARD = 'reward',                // Награда (миссии, бонусы)
  BOOST_PURCHASE = 'boost_purchase', // Покупка буста
  FARMING_REWARD = 'farming_reward', // Начисление от фарминга
  REFERRAL = 'referral',            // Реферальное вознаграждение
  MISSION = 'mission',              // Награда за миссию
  DAILY_BONUS = 'daily_bonus',      // Ежедневный бонус
  TON_BOOST = 'ton_boost',          // TON буст
  UNI_BOOST = 'uni_boost'           // UNI буст
}

/**
 * Валюты
 */
export enum Currency {
  UNI = 'UNI',
  TON = 'TON'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',      // В ожидании
  CONFIRMED = 'confirmed',  // Подтверждена
  REJECTED = 'rejected'     // Отклонена
}

/**
 * Категории транзакций
 */
export enum TransactionCategory {
  DEPOSIT = 'deposit',     // Пополнение
  WITHDRAWAL = 'withdrawal', // Вывод
  BONUS = 'bonus',         // Бонус
  FARMING = 'farming',     // Фарминг
  MISSION = 'mission',     // Миссия
  REFERRAL = 'referral'    // Реферальная программа
}

/**
 * Интерфейс для логирования транзакции
 */
interface LogTransactionParams {
  userId: number;
  type: string;
  currency: string;
  amount: string | number;
  status?: string;
  source?: string;
  category?: string;
  txHash?: string; // Хеш транзакции для TON
  walletAddress?: string; // Адрес кошелька (временно не используется)
}

/**
 * Сервис для работы с транзакциями
 */
export class TransactionService {
  /**
   * Логирует транзакцию в базу данных
   * @param params Параметры транзакции
   * @returns Созданная транзакция
   */
  static async logTransaction(params: LogTransactionParams) {
    try {
      // Форматируем amount как строку, если передано число
      const amount = typeof params.amount === 'number' 
        ? params.amount.toString() 
        : params.amount;

      // Базовые данные транзакции
      const transactionData: InsertTransaction = {
        user_id: params.userId,
        type: params.type,
        currency: params.currency,
        amount: amount,
        status: params.status || TransactionStatus.CONFIRMED,
        source: params.source || 'app',
        category: params.category || this.getCategoryFromType(params.type)
      };

      // Если передан хеш транзакции TON, добавляем его в метаданные
      if (params.txHash) {
        transactionData.tx_hash = params.txHash;
      }

      // Валидируем данные через Zod-схему
      const validatedData = insertTransactionSchema.parse(transactionData);

      // Сохраняем транзакцию в базу данных
      const [result] = await db
        .insert(transactions)
        .values(validatedData)
        .returning();

      console.log(
        `[Transaction] ${params.type} | Amount: ${amount} ${params.currency} | User: ${params.userId}${
          params.txHash ? ` | TX_HASH: ${params.txHash}` : ''
        } | Saved`
      );

      return result;
    } catch (error) {
      console.error('[TransactionService] Ошибка при логировании транзакции:', error);
      throw error;
    }
  }

  /**
   * Определяет категорию транзакции на основе её типа
   * @param type Тип транзакции
   * @returns Категория транзакции
   */
  private static getCategoryFromType(type: string): string {
    switch (type) {
      case TransactionType.DEPOSIT:
      case TransactionType.TON_BOOST:
      case TransactionType.UNI_BOOST:
        return TransactionCategory.DEPOSIT;
      case TransactionType.WITHDRAW:
        return TransactionCategory.WITHDRAWAL;
      case TransactionType.REWARD:
      case TransactionType.DAILY_BONUS:
        return TransactionCategory.BONUS;
      case TransactionType.FARMING_REWARD:
      case TransactionType.BOOST_PURCHASE:
        return TransactionCategory.FARMING;
      case TransactionType.MISSION:
        return TransactionCategory.MISSION;
      case TransactionType.REFERRAL:
        return TransactionCategory.REFERRAL;
      default:
        return TransactionCategory.DEPOSIT;
    }
  }
}