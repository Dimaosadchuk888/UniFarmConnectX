/**
 * Модели кошелька - описывают структуры таблиц wallet и transactions в базе данных
 */

// Define wallet-specific enums
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FARMING_REWARD = 'farming_reward',
  REFERRAL_BONUS = 'referral_bonus',
  DAILY_BONUS = 'daily_bonus'
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WalletModel {
  id: string;
  user_id: string;
  balance_uni: string;
  balance_ton: string;
  total_earned_uni: string;
  total_earned_ton: string;
  total_withdrawn_uni: string;
  total_withdrawn_ton: string;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionModel {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: string;
  currency: 'uni' | 'ton';
  status: TransactionStatus;
  hash?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  completed_at?: Date;
}

export interface WalletCreateModel {
  user_id: string;
  balance_uni?: string;
  balance_ton?: string;
}

export interface TransactionCreateModel {
  user_id: string;
  type: TransactionType;
  amount: string;
  currency: 'uni' | 'ton';
  description?: string;
  metadata?: Record<string, any>;
}

export interface WalletStatsModel {
  total_wallets: number;
  total_balance_uni: string;
  total_balance_ton: string;
  total_transactions: number;
  pending_transactions: number;
}