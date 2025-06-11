/**
 * Модель пользователя - описывает структуру таблицы users в базе данных
 */

export interface UserModel {
  id: string;
  telegram_id: number | null;
  username: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string;
  parent_ref_code?: string | null;
  guest_id: string;
  is_premium?: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateModel {
  telegram_id?: number;
  username: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  balance_uni?: string;
  balance_ton?: string;
  ref_code: string;
  parent_ref_code?: string;
  guest_id: string;
  is_premium?: boolean;
}

export interface UserUpdateModel {
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  balance_uni?: string;
  balance_ton?: string;
  is_premium?: boolean;
  is_active?: boolean;
}

export interface UserStatsModel {
  total_users: number;
  active_users: number;
  premium_users: number;
  users_with_referrals: number;
  avg_balance_uni: string;
  avg_balance_ton: string;
}