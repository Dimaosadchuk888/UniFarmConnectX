export interface DailyBonusConfig {
  id: number;
  day_number: number;
  bonus_amount: string;
  bonus_type: 'UNI' | 'TON' | 'MULTIPLIER';
  multiplier?: string;
  description?: string;
  is_active: boolean;
}

export interface UserStreakData {
  user_id: number;
  current_streak: number;
  longest_streak: number;
  last_claim_date?: Date;
  next_available_claim?: Date;
  total_bonuses_claimed: number;
  can_claim_today: boolean;
}

export interface DailyBonusClaimRequest {
  user_id: number;
  day_number: number;
}

export interface DailyBonusClaimResult {
  success: boolean;
  claimed_amount?: string;
  bonus_type?: string;
  new_streak?: number;
  next_bonus?: DailyBonusConfig;
  message?: string;
}

export interface DailyBonusCalendar {
  bonuses: DailyBonusConfig[];
  user_streak: UserStreakData;
  claimed_days: number[];
  next_bonus: DailyBonusConfig | null;
}

export type BonusType = 'UNI' | 'TON' | 'MULTIPLIER';

export interface BonusHistoryItem {
  id: number;
  day_number: number;
  claimed_amount: string;
  claimed_at: Date;
  streak_count: number;
}