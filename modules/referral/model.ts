/**
 * Модели реферальной системы - описывают структуры таблиц referrals в базе данных
 */

// Supabase table constants
export const REFERRAL_TABLES = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  REFERRALS: 'referrals'
} as const;

// Referral configuration constants
export const REFERRAL_CONFIG = {
  MAX_LEVELS: 20,
  DEFAULT_COMMISSION_RATE: 0.05,
  MIN_COMMISSION_RATE: 0.001,
  REF_CODE_LENGTH: 8,
  REF_CODE_PREFIX: 'REF_'
} as const;

// 20-уровневая система комиссионных начислений UniFarm
export const REFERRAL_COMMISSION_RATES = {
  1: 1.0,    // 100% для 1-го уровня
  2: 0.20,   // 20% для 2-го уровня
  3: 0.18,   // 18% для 3-го уровня
  4: 0.16,   // 16% для 4-го уровня
  5: 0.14,   // 14% для 5-го уровня
  6: 0.12,   // 12% для 6-го уровня
  7: 0.10,   // 10% для 7-го уровня
  8: 0.09,   // 9% для 8-го уровня
  9: 0.08,   // 8% для 9-го уровня
  10: 0.07,  // 7% для 10-го уровня
  11: 0.06,  // 6% для 11-го уровня
  12: 0.055, // 5.5% для 12-го уровня
  13: 0.05,  // 5% для 13-го уровня
  14: 0.045, // 4.5% для 14-го уровня
  15: 0.04,  // 4% для 15-го уровня
  16: 0.035, // 3.5% для 16-го уровня
  17: 0.03,  // 3% для 17-го уровня
  18: 0.025, // 2.5% для 18-го уровня
  19: 0.022, // 2.2% для 19-го уровня
  20: 0.02   // 2% для 20-го уровня
} as const;

// Define referral-specific enums
export enum ReferralStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed'
}

export enum ReferralEarningType {
  DIRECT_REFERRAL = 'direct_referral',
  INDIRECT_REFERRAL = 'indirect_referral',
  FARMING_BONUS = 'farming_bonus',
  MILESTONE_BONUS = 'milestone_bonus'
}

export interface ReferralModel {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  ref_code: string;
  status: ReferralStatus;
  commission_earned: string;
  commission_currency: 'uni' | 'ton';
  level: number;
  created_at: Date;
  activated_at?: Date;
}

export interface ReferralCodeModel {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  usage_count: number;
  max_usage?: number;
  created_at: Date;
  expires_at?: Date;
}

export interface ReferralEarningsModel {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  earning_type: ReferralEarningType;
  amount: string;
  currency: 'uni' | 'ton';
  source_transaction_id?: string;
  created_at: Date;
}



export interface ReferralCreateModel {
  referrer_user_id: string;
  referred_user_id: string;
  ref_code: string;
  level?: number;
}

export interface ReferralStatsModel {
  total_referrals: number;
  active_referrals: number;
  total_earnings: string;
  referral_levels: Record<number, number>;
  top_referrers: Array<{
    user_id: string;
    username: string;
    referral_count: number;
    total_earnings: string;
  }>;
}