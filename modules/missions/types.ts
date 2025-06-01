export interface MissionConfig {
  id: number;
  title: string;
  description?: string;
  mission_type: 'daily' | 'weekly' | 'one_time' | 'referral';
  target_value?: number;
  reward_amount: string;
  reward_type: 'UNI' | 'TON' | 'BOOST';
  requirements?: string;
  start_date?: Date;
  end_date?: Date;
  is_active: boolean;
  is_repeatable: boolean;
  sort_order: number;
}

export interface UserMissionProgress {
  id: number;
  mission_id: number;
  mission: MissionConfig;
  status: 'active' | 'completed' | 'claimed';
  progress: number;
  target_value?: number;
  progress_percentage: number;
  completed_at?: Date;
  claimed_at?: Date;
  reward_claimed?: string;
  can_claim: boolean;
}

export interface MissionClaimRequest {
  mission_id: number;
}

export interface MissionClaimResult {
  success: boolean;
  claimed_amount?: string;
  reward_type?: string;
  message?: string;
}

export interface MissionRequirements {
  min_farming_amount?: string;
  referral_count?: number;
  daily_login_streak?: number;
  transaction_count?: number;
  custom_condition?: string;
}

export type MissionType = 'daily' | 'weekly' | 'one_time' | 'referral';
export type RewardType = 'UNI' | 'TON' | 'BOOST';