/**
 * Модели кошелька - описывают структуры таблиц wallet и transactions в базе данных
 */

// Імпортуємо централізовані enum типи
export { TransactionType, TransactionStatus } from '../../shared/schema';

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