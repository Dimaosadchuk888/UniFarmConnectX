export interface WalletBalance {
  user_id: number;
  balance_uni: string;
  balance_ton: string;
  uni_farming_balance: string;
  accumulated_ton: string;
  total_deposited: string;
  total_withdrawn: string;
  last_updated: Date;
}

export interface TransactionData {
  id: number;
  user_id: number;
  transaction_type: TransactionType;
  amount: string;
  currency: 'UNI' | 'TON';
  status: TransactionStatus;
  description?: string;
  reference_id?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface WithdrawalRequest {
  amount: string;
  currency: 'UNI' | 'TON';
  wallet_address: string;
  network?: string;
}

export interface WithdrawalData {
  id: number;
  user_id: number;
  amount: string;
  currency: 'UNI' | 'TON';
  wallet_address: string;
  network?: string;
  status: WithdrawalStatus;
  transaction_hash?: string;
  fee_amount?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface DepositData {
  id: number;
  user_id: number;
  amount: string;
  currency: 'UNI' | 'TON';
  source: DepositSource;
  transaction_hash?: string;
  created_at: Date;
}

export type TransactionType = 
  | 'deposit' 
  | 'withdrawal' 
  | 'farming_reward' 
  | 'referral_commission' 
  | 'boost_reward'
  | 'mission_reward'
  | 'daily_bonus';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DepositSource = 'manual' | 'farming' | 'referral' | 'boost' | 'mission' | 'bonus';

export interface WalletSummary {
  balances: WalletBalance;
  recent_transactions: TransactionData[];
  pending_withdrawals: WithdrawalData[];
  total_earned_today: string;
}