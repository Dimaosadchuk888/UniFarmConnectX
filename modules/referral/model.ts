/**
 * Модели реферальной системы - описывают структуры таблиц referrals в базе данных
 */

// Імпортуємо централізовані enum типи
import { ReferralStatus, ReferralEarningType } from '@/shared/schema';
export { ReferralStatus, ReferralEarningType };

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