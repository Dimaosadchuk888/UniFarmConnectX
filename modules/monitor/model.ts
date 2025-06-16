/**
 * Monitor Module Data Model
 * Константы и схема данных для модуля мониторинга системы
 */

// Основные таблицы, используемые для мониторинга
export const USERS_TABLE = 'users';
export const FARMING_SESSIONS_TABLE = 'farming_sessions';
export const TRANSACTIONS_TABLE = 'transactions';
export const BOOST_PACKAGES_TABLE = 'boost_packages';

// Поля пользователей для мониторинга
export const MONITOR_USER_FIELDS = [
  'id',
  'created_at',
  'balance_uni',
  'balance_ton',
  'referrer_id',
  'checkin_last_date'
];

// Поля фарминг сессий для мониторинга
export const MONITOR_FARMING_FIELDS = [
  'id',
  'user_id',
  'amount',
  'daily_rate',
  'total_earned',
  'is_active',
  'created_at'
];

// Поля транзакций для мониторинга
export const MONITOR_TRANSACTION_FIELDS = [
  'id',
  'user_id',
  'type',
  'amount',
  'currency',
  'created_at'
];

// Поля boost пакетов для мониторинга
export const MONITOR_BOOST_FIELDS = [
  'id',
  'name',
  'price',
  'multiplier',
  'duration_hours'
];

// Статусы здоровья системы
export const SYSTEM_HEALTH_STATUS = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy'
} as const;

// Статусы подключений
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  OPERATIONAL: 'operational'
} as const;

// Временные интервалы для мониторинга
export const MONITOR_TIME_INTERVALS = {
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000
} as const;