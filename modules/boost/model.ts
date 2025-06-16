/**
 * Boost Model - Supabase Integration
 * Константы и типы для системы ускорений
 */

// Supabase table constants
export const BOOST_TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions'
} as const;

// Boost package types
export const BOOST_TYPES = {
  FARMING_SPEED: 'farming_speed',
  DAILY_BONUS: 'daily_bonus',
  REFERRAL_BONUS: 'referral_bonus'
} as const;

// Boost status
export const BOOST_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  PENDING: 'pending'
} as const;

// Boost configuration
export const BOOST_CONFIG = {
  DEFAULT_RATE: 0.01,
  MIN_AMOUNT: '10.0',
  MAX_AMOUNT: '100000.0',
  DEFAULT_DURATION_DAYS: 365, // Изменено на 365 дней
  RATE_PRECISION: 4
} as const;

// Transaction types for boost operations
export const BOOST_TRANSACTION_TYPES = {
  TON_BOOST_INCOME: 'ton_boost_income',
  BOOST_UNI_BONUS: 'boost_uni_bonus',
  BOOST_PURCHASE: 'boost_purchase'
} as const;

// Boost package definitions - оригинальная модель с 365 днями и бонусами UNI
export const BOOST_PACKAGES = {
  STARTER: {
    name: 'Starter Boost',
    daily_rate: '0.01', // 1% в день
    min_amount: '10.0',
    max_amount: '1000.0',
    duration_days: 365,
    uni_bonus: '10000' // 10,000 UNI бонус
  },
  STANDARD: {
    name: 'Standard Boost',
    daily_rate: '0.015', // 1.5% в день
    min_amount: '100.0',
    max_amount: '5000.0',
    duration_days: 365,
    uni_bonus: '75000' // 75,000 UNI бонус
  },
  ADVANCED: {
    name: 'Advanced Boost',
    daily_rate: '0.02', // 2% в день
    min_amount: '500.0',
    max_amount: '10000.0',
    duration_days: 365,
    uni_bonus: '250000' // 250,000 UNI бонус
  },
  PREMIUM: {
    name: 'Premium Boost',
    daily_rate: '0.025', // 2.5% в день
    min_amount: '1000.0',
    max_amount: '25000.0',
    duration_days: 365,
    uni_bonus: '500000' // 500,000 UNI бонус
  },
  ELITE: {
    name: 'Elite Boost',
    daily_rate: '0.03', // 3% в день
    min_amount: '5000.0',
    max_amount: '100000.0',
    duration_days: 365,
    uni_bonus: '1000000' // 1,000,000 UNI бонус
  }
} as const;