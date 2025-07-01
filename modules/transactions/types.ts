
export type TransactionsTransactionType = 
  | 'farming_income'
  | 'referral_bonus' 
  | 'mission_reward'
  | 'daily_bonus'
  | 'boost_purchase'
  | 'withdrawal'
  | 'deposit'
  | 'ton_farming_income'
  | 'ton_boost_reward';

export type TransactionsTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionsTransactionType;
  amount?: string;  // Делаем опциональным для обратной совместимости
  amount_uni?: string;  // Добавляем поле для UNI
  amount_ton?: string;  // Добавляем поле для TON
  currency?: 'UNI' | 'TON' | null;  // Делаем опциональным
  status: TransactionsTransactionStatus;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TransactionCreateRequest {
  user_id: number;
  type: TransactionsTransactionType;
  amount: string;
  currency: 'UNI' | 'TON';
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionStats {
  totalTransactions: number;
  totalIncome: {
    UNI: string;
    TON: string;
  };
  totalOutcome: {
    UNI: string;
    TON: string;
  };
}

export interface TransactionFilters {
  currency?: 'UNI' | 'TON' | 'ALL';
  type?: TransactionsTransactionType;
  status?: TransactionsTransactionStatus;
  dateFrom?: string;
  dateTo?: string;
}
