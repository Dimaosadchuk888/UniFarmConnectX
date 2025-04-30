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
  // Временно заблокировано, пока не будет выполнена миграция БД
  // walletAddress?: string; // Адрес кошелька (временно не используется)
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

      // Используем прямой SQL-запрос для обхода проблемы с отсутствующим полем wallet_address
      const result = await db.execute(`
        INSERT INTO transactions 
        (user_id, type, currency, amount, status, source, category, tx_hash)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        params.userId,
        params.type,
        params.currency,
        amount,
        params.status || TransactionStatus.CONFIRMED,
        params.source || 'app',
        params.category || this.getCategoryFromType(params.type),
        params.txHash || null
      ]);

      console.log(
        `[Transaction] ${params.type} | Amount: ${amount} ${params.currency} | User: ${params.userId}${
          params.txHash ? ` | TX_HASH: ${params.txHash}` : ''
        } | Saved`
      );

      return result.rows[0];
    } catch (error) {
      console.error('[TransactionService] Ошибка при логировании транзакции:', error);
      // Пишем в лог, но не выбрасываем ошибку дальше, чтобы не блокировать бэкграунд-процессы
      console.warn('[TransactionService] Транзакция не сохранена, продолжаем работу');
      return null;
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