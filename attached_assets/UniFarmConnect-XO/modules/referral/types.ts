export interface ReferralData {
  id: number;
  user_id: number;
  referrer_id?: number;
  referral_code: string;
  total_referrals: number;
  total_earned: string;
  level: number;
  created_at: Date;
}

export interface ReferralStats {
  total_referrals: number;
  direct_referrals: number;
  total_commission_earned: string;
  levels_data: ReferralLevelData[];
  referral_code: string;
}

export interface ReferralLevelData {
  level: number;
  referrals_count: number;
  commission_rate: string;
  total_earned: string;
}

export interface ReferralCommission {
  id: number;
  from_user_id: number;
  to_user_id: number;
  transaction_id: number;
  level: number;
  commission_rate: string;
  commission_amount: string;
  source_type: 'farming' | 'boost' | 'transaction';
  created_at: Date;
}

export interface ReferralTreeNode {
  user_id: number;
  referral_code: string;
  level: number;
  referrals_count: number;
  total_earned: string;
  children: ReferralTreeNode[];
}

export interface CommissionCalculation {
  level: number;
  commission_rate: string;
  commission_amount: string;
  recipient_id: number;
}

export type ReferralSource = 'farming' | 'boost' | 'transaction' | 'mission';