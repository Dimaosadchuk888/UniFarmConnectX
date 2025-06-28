
export interface TonFarmingSession {
  id: number;
  user_id: number;
  ton_amount: string;
  start_date: Date;
  end_date?: Date;
  status: 'active' | 'completed' | 'cancelled';
  daily_rate: string;
  total_earned: string;
  last_claim: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TonFarmingData {
  balance_ton: string;
  ton_farming_rate: string;
  ton_farming_start_timestamp: Date | null;
  ton_farming_last_update: Date | null;
  is_active: boolean;
  can_claim: boolean;
}

export interface TonFarmingStatus {
  isActive: boolean;
  currentBalance: string;
  rate: string;
  lastUpdate: string | null;
  canClaim: boolean;
  estimatedReward: string;
}

export interface TonFarmingClaimResult {
  amount: string;
  claimed: boolean;
}

export interface TonFarmingStartRequest {
  amount?: string;
}

export interface TonFarmingInfo {
  totalTonRatePerSecond: string;
  totalUniRatePerSecond: string;
  dailyIncomeTon: string;
  dailyIncomeUni: string;
  deposits: Array<{
    id: number;
    user_id: number;
    ton_amount: string | number;
    uni_amount?: string | number;
    start_date: string;
    end_date?: string;
    status: string;
    created_at: string;
  }>;
}
