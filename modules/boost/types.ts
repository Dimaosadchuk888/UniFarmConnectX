export interface BoostPackageInfo {
  id: number;
  name: string;
  description?: string;
  daily_rate: string;
  min_amount: string;
  max_amount?: string;
  duration_days: number;
  is_active: boolean;
}

export interface UserBoostData {
  id: number;
  package_id: number;
  package_name: string;
  amount: string;
  daily_rate: string;
  start_date: Date;
  end_date: Date;
  last_claim?: Date;
  total_earned: string;
  days_remaining: number;
  available_to_claim: string;
  is_active: boolean;
}

export interface BoostPurchaseRequest {
  package_id: number;
  amount: string;
}

export interface BoostClaimRequest {
  boost_id: number;
}

export interface BoostCalculationResult {
  daily_income: string;
  total_potential: string;
  days_remaining: number;
  next_claim_available: Date;
}

export type BoostStatus = 'active' | 'expired' | 'claimed' | 'pending';

export interface BoostSummary {
  total_active_boosts: number;
  total_invested: string;
  total_earned: string;
  daily_income: string;
  packages: UserBoostData[];
}

export interface BoostPurchaseData {
  id: string;
  user_id: string;
  boost_id: string;
  source: 'wallet' | 'ton';
  tx_hash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface PurchaseBoostRequest {
  user_id: string;
  boost_id: string;
  payment_method: 'wallet' | 'ton';
  tx_hash?: string;
}

export interface PurchaseBoostResponse {
  success: boolean;
  message: string;
  purchase?: BoostPurchaseData;
}

export interface VerifyTonPaymentRequest {
  tx_hash: string;
  user_id: string;
  boost_id: string;
}

export interface VerifyTonPaymentResponse {
  success: boolean;
  status: 'confirmed' | 'waiting' | 'not_found' | 'error';
  message: string;
  transaction_amount?: string;
  boost_activated?: boolean;
}