export interface User {
  id: number;
  telegram_id: number | null;
  username: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string;
  guest_id: string;
  created_at?: string;
  parent_ref_code?: string | null;
}

export interface InsertUser {
  telegram_id?: number | null;
  username: string;
  ref_code: string;
  guest_id: string;
  parent_ref_code?: string | null;
}

export interface UpdateUser {
  username?: string;
  balance_uni?: string;
  balance_ton?: string;
}

export interface ApiError {
  hasError: boolean;
  message: string;
  code?: string;
  details?: any;
}