/**
 * Сервис для работы с транзакциями
 * Содержит константы и перечисления для работы с транзакциями
 */

/**
 * Типы транзакций
 */
export enum TransactionType {
  // Базовые операции
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  
  // Фарминг и награды
  FARMING_DEPOSIT = 'farming_deposit',
  FARMING_HARVEST = 'farming_harvest',
  FARMING_REWARD = 'farming_reward',
  
  // TON Boost
  TON_BOOST = 'ton_boost',
  TON_BOOST_REWARD = 'ton_boost_reward',
  
  // Реферальная система
  REFERRAL_REWARD = 'referral_reward',
  
  // Прочие
  REFUND = 'refund',
  BONUS = 'bonus'
}

/**
 * Валюты для транзакций
 */
export enum Currency {
  UNI = 'UNI',
  TON = 'TON'
}

/**
 * Статусы транзакций
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected'
}

/**
 * Категории транзакций для группировки
 */
export enum TransactionCategory {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FARMING = 'farming',
  TON_BOOST = 'ton_boost',
  REFERRAL = 'referral',
  BONUS = 'bonus',
  SYSTEM = 'system'
}

/**
 * Класс TransactionService для работы с транзакциями
 * Этот класс будет развиваться с добавлением методов работы с транзакциями
 */
export class TransactionService {
  // Будущие методы для работы с транзакциями
}