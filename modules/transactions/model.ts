/**
 * Модель данных для модуля Transactions UniFarm
 * Константы и схема для работы с Supabase
 */

export const TRANSACTIONS_TABLE = 'transactions';

export const TRANSACTIONS_FIELDS = [
  'id',
  'user_id',
  'type',
  'amount',
  'currency',
  'status',
  'description',
  'metadata',
  'created_at',
  'updated_at',
  'tx_hash'
];

export const TRANSACTION_TYPES = {
  FARMING_INCOME: 'farming_income',
  FARMING_DEPOSIT: 'farming_deposit',  // Добавлен тип для депозита в фарминг
  REFERRAL_BONUS: 'referral_bonus',
  MISSION_REWARD: 'mission_reward',
  DAILY_BONUS: 'daily_bonus',
  BOOST_PURCHASE: 'boost_purchase',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit',
  TON_FARMING_INCOME: 'ton_farming_income',
  TON_BOOST_REWARD: 'ton_boost_reward'
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export const CURRENCIES = {
  UNI: 'UNI',
  TON: 'TON'
} as const;

export const DEFAULT_TRANSACTION_STATUS = TRANSACTION_STATUS.PENDING;