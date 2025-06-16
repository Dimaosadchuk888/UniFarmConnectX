/**
 * TON Farming Model
 * Централизованные константы для модуля tonFarming
 */

// Константы таблиц базы данных
export const TON_FARMING_TABLE = 'users';
export const TON_FARMING_SESSIONS_TABLE = 'farming_sessions';
export const TON_TRANSACTIONS_TABLE = 'transactions';

// Поля пользователя для TON фарминга
export const TON_FARMING_FIELDS = {
  BALANCE: 'balance_ton',
  FARMING_BALANCE: 'ton_farming_balance',
  FARMING_RATE: 'ton_farming_rate',
  FARMING_START: 'ton_farming_start_timestamp',
  FARMING_LAST_UPDATE: 'ton_farming_last_update',
  FARMING_ACTIVE: 'ton_farming_active'
} as const;

// Константы для TON фарминга
export const TON_FARMING_CONFIG = {
  DEFAULT_RATE: '0.001',
  MINIMUM_DEPOSIT: '0.01',
  MAXIMUM_DEPOSIT: '1000.00',
  CLAIM_INTERVAL_HOURS: 24,
  REWARD_PRECISION: 8
} as const;

// Статусы TON фарминга
export const TON_FARMING_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused',
  COMPLETED: 'completed'
} as const;

// Типы транзакций TON
export const TON_TRANSACTION_TYPES = {
  FARMING_START: 'ton_farming_start',
  FARMING_CLAIM: 'ton_farming_claim',
  FARMING_DEPOSIT: 'ton_farming_deposit',
  FARMING_WITHDRAW: 'ton_farming_withdraw'
} as const;

// Временные интервалы
export const TON_TIME_INTERVALS = {
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  WEEK_MS: 7 * 24 * 60 * 60 * 1000
} as const;

// Сообщения для логирования
export const TON_FARMING_MESSAGES = {
  START_SUCCESS: 'TON фарминг успешно запущен',
  START_ERROR: 'Ошибка запуска TON фарминга',
  CLAIM_SUCCESS: 'TON награды успешно получены',
  CLAIM_ERROR: 'Ошибка получения TON наград',
  STATUS_RETRIEVED: 'Статус TON фарминга получен',
  STATUS_ERROR: 'Ошибка получения статуса TON фарминга',
  INVALID_TELEGRAM_ID: 'Невалидный telegram_id для TON фарминга',
  INSUFFICIENT_BALANCE: 'Недостаточный баланс TON для фарминга'
} as const;

// Валидация данных
export const TON_FARMING_VALIDATION = {
  MIN_TELEGRAM_ID: 1,
  MAX_TELEGRAM_ID: 999999999999,
  AMOUNT_REGEX: /^\d+(\.\d{1,8})?$/,
  RATE_REGEX: /^0\.\d{3,8}$/
} as const;