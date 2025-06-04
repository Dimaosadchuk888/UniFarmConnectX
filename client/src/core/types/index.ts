/**
 * Основные типы приложения
 */

export interface User {
  id: number;
  telegram_id?: number | null;
  username?: string;
  guest_id?: string;
  ref_code?: string;
  parent_ref_code?: string | null;
  balance_uni: string;
  balance_ton: string;
  wallet?: string;
  ton_wallet_address?: string;
  uni_deposit_amount?: string;
  uni_farming_start_timestamp?: string | null;
  uni_farming_balance?: string;
  uni_farming_rate?: string;
  uni_farming_last_update?: string | null;
  uni_farming_deposit?: string;
  uni_farming_activated_at?: string;
  created_at?: string;
  checkin_last_date?: string;
  checkin_streak?: number;
}

export interface InsertUser {
  telegram_id?: number;
  username?: string;
  guest_id?: string;
  ref_code?: string;
  parent_ref_code?: string;
  balance_uni?: string;
  balance_ton?: string;
}

export interface UserValidation {
  hasId: boolean;
  idIsPositive: boolean;
  hasTelegramId: boolean;
  telegramIdValue: number | null;
  hasUsername: boolean;
  hasBalanceUni: boolean;
  hasBalanceTon: boolean;
  hasRefCode: boolean;
  refCodeValue: string;
  rawData: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  reward_uni: string;
  reward_ton: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  currency: 'UNI' | 'TON';
  status: string;
  created_at: string;
}