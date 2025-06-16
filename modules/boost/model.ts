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
  MAX_AMOUNT: '10000.0',
  DEFAULT_DURATION_DAYS: 30,
  RATE_PRECISION: 4
} as const;

// Boost package definitions
export const BOOST_PACKAGES = {
  STARTER: {
    name: 'Starter Boost',
    daily_rate: '0.01',
    min_amount: '10.0',
    max_amount: '100.0',
    duration_days: 7
  },
  PREMIUM: {
    name: 'Premium Boost',
    daily_rate: '0.02',
    min_amount: '100.0',
    max_amount: '1000.0',
    duration_days: 30
  },
  ELITE: {
    name: 'Elite Boost',
    daily_rate: '0.03',
    min_amount: '1000.0',
    max_amount: '10000.0',
    duration_days: 90
  }
} as const;