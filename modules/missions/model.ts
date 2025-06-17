/**
 * Missions Model - Supabase Integration
 * Константы и типы для системы заданий
 */

// Supabase table constants
export const MISSIONS_TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions'
} as const;

// Mission types
export const MISSION_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  ONE_TIME: 'one_time',
  REFERRAL: 'referral',
  TELEGRAM_GROUP: 'telegram_group',
  TELEGRAM_CHANNEL: 'telegram_channel',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok'
} as const;

// Mission status
export const MISSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CLAIMED: 'claimed'
} as const;

// Reward types
export const REWARD_TYPES = {
  UNI: 'UNI',
  TON: 'TON',
  BOOST: 'BOOST'
} as const;

// Mission configuration
export const MISSIONS_CONFIG = {
  DEFAULT_REWARD_AMOUNT: '1.0',
  MAX_DAILY_MISSIONS: 10,
  MISSION_TIMEOUT_HOURS: 24
} as const;