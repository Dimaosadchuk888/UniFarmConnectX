/**
 * Модели фарминга - описывают структуры таблиц farming в базе данных
 */

// Імпортуємо централізовані enum типи
import { FarmingType, FarmingStatus, RewardType } from '../../shared/schema';
export { FarmingType, FarmingStatus, RewardType };

export interface FarmingSessionModel {
  id: string;
  user_id: string;
  session_type: FarmingType;
  amount_deposited: string;
  currency: 'uni' | 'ton';
  reward_rate: number;
  total_earned: string;
  status: FarmingStatus;
  started_at: Date;
  ends_at: Date;
  harvested_at?: Date;
  created_at: Date;
}

export interface FarmingRewardModel {
  id: string;
  user_id: string;
  farming_session_id: string;
  amount: string;
  currency: 'uni' | 'ton';
  reward_type: RewardType;
  multiplier: number;
  created_at: Date;
}



export interface FarmingConfigModel {
  id: string;
  farming_type: FarmingType;
  min_amount: string;
  max_amount: string;
  base_rate: number;
  duration_hours: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FarmingCreateModel {
  user_id: string;
  session_type: FarmingType;
  amount_deposited: string;
  currency: 'uni' | 'ton';
  duration_hours?: number;
}

export interface FarmingStatsModel {
  total_sessions: number;
  active_sessions: number;
  total_deposited_uni: string;
  total_deposited_ton: string;
  total_rewards_paid: string;
  average_session_duration: number;
}