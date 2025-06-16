/**
 * Daily Bonus Model - Supabase Integration
 * Константы и типы для системы ежедневных бонусов
 */

// Supabase table constants
export const DAILY_BONUS_TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions'
} as const;

// Bonus types
export const BONUS_TYPES = {
  UNI: 'UNI',
  TON: 'TON',
  MULTIPLIER: 'MULTIPLIER'
} as const;

// Daily bonus configuration
export const DAILY_BONUS_CONFIG = {
  DEFAULT_BONUS_AMOUNT: '1.0',
  MAX_STREAK_DAYS: 30,
  BONUS_MULTIPLIER: 1.1,
  COOLDOWN_HOURS: 24
} as const;

// Bonus calculation constants
export const STREAK_BONUSES = {
  DAY_7: '2.0',
  DAY_14: '5.0', 
  DAY_21: '10.0',
  DAY_30: '20.0'
} as const;