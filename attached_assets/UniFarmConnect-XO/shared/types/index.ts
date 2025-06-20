// Общие типы для всего приложения
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
  referralCode?: string;
  referredBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  uniBalance: string;
  tonBalance: string;
  totalEarned: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'farming' | 'referral' | 'bonus';
  amount: string;
  currency: 'UNI' | 'TON';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  createdAt: Date;
}