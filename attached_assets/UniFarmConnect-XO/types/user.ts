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
  uni_farming_start_timestamp?: string;
  uni_farming_balance?: string;
  uni_farming_rate?: string;
  uni_farming_last_update?: string;
  uni_farming_deposit?: string;
  uni_farming_activated_at?: string;
  created_at?: string;
  checkin_last_date?: string;
  checkin_streak?: number;
}

export interface CreateUserRequest {
  telegram_id?: number;
  guest_id?: string;
  username?: string;
  ref_code?: string;
  parent_ref_code?: string;
}

export interface UpdateUserRequest {
  username?: string;
  wallet?: string;
  ton_wallet_address?: string;
  ref_code?: string;
  parent_ref_code?: string;
}

export interface UserBalance {
  balance_uni: string;
  balance_ton: string;
}

export interface RefCodeValidation {
  isValid: boolean;
  exists: boolean;
  message?: string;
}