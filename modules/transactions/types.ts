
// Унифицированные типы транзакций для всех модулей системы
// Поддерживаются в текущей схеме базы данных
export type TransactionsTransactionType = 
  | 'FARMING_REWARD'     // UNI фарминг доходы + TON Boost доходы + депозиты
  | 'REFERRAL_REWARD'    // Реферальные бонусы
  | 'MISSION_REWARD'     // Награды за миссии
  | 'DAILY_BONUS';       // Ежедневные бонусы + airdrop награды

// Расширенные типы транзакций (будут добавлены при обновлении схемы БД)
export type ExtendedTransactionType = TransactionsTransactionType
  | 'TON_BOOST_INCOME'   // Доходы от TON Boost
  | 'UNI_DEPOSIT'        // Пополнение UNI
  | 'TON_DEPOSIT'        // Пополнение TON
  | 'UNI_WITHDRAWAL'     // Вывод UNI
  | 'TON_WITHDRAWAL'     // Вывод TON
  | 'BOOST_PURCHASE'     // Покупка boost пакетов
  | 'AIRDROP_REWARD';    // Награды за airdrop

export type TransactionsTransactionStatus = 'pending' | 'completed' | 'confirmed' | 'failed' | 'cancelled';

export interface Transaction {
  id: number;
  user_id: number;
  type: TransactionsTransactionType;
  amount: string;  // Теперь обязательное поле
  amount_uni?: string;  // Оставляем для совместимости
  amount_ton?: string;  // Оставляем для совместимости
  currency: 'UNI' | 'TON';  // Теперь обязательное поле
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
