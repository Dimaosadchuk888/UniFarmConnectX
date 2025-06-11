// Імпорт enum'ів з централізованого schema
import type { TransactionType, TransactionStatus } from '../../shared/schema';

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

export interface DepositRecord {
  id: number;
  user_id: number;
  amount: string;
  currency: 'UNI' | 'TON';
  source: DepositSource;
  transaction_hash?: string;
  created_at: Date;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type DepositSource = 'manual' | 'farming' | 'referral' | 'boost' | 'mission' | 'bonus';

export interface WalletOperationResult {
  success: boolean;
  transaction_id?: string;
  new_balance?: string;
  error?: string;
}

export interface WalletSummary {
  total_balance_uni: string;
  total_balance_ton: string;
  total_earned: string;
  total_withdrawn: string;
  active_deposits: number;
  pending_withdrawals: number;
}