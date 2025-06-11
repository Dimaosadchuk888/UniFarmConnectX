export interface FarmingSession {
  id: number;
  user_id: number;
  amount: string;
  daily_rate: string;
  start_time: Date;
  last_claim: Date;
  total_earned: string;
  is_active: boolean;
}

export interface FarmingStats {
  total_deposited: string;
  total_earned: string;
  daily_income: string;
  active_sessions: number;
  available_to_claim: string;
}

export interface FarmingDepositRequest {
  amount: string;
}

export interface FarmingClaimRequest {
  session_id?: number;
}

export interface FarmingClaimResult {
  success: boolean;
  claimed_amount?: string;
  new_balance?: string;
  message?: string;
}

export interface RewardCalculation {
  principal: string;
  daily_rate: string;
  hours_elapsed: number;
  calculated_reward: string;
  total_available: string;
}

// FarmingStatus и RewardType определены в model.ts как enum'ы