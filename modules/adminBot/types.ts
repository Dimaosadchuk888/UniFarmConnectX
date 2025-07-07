/**
 * Admin Bot types
 */

export interface WithdrawalRequest {
  id: string; // UUID
  user_id: number;
  telegram_id?: string;
  username?: string;
  amount_ton: number;
  ton_wallet: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  usersLast24h: number;
  totalUniBalance: string;
  totalTonBalance: string;
  activeFarmingSessions: number;
  totalFarmingSessions: number;
  totalTransactions: number;
  transactionsLast24h: number;
}

export interface AdminUser {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  balance_uni: string;
  balance_ton: string;
  ref_code: string;
  referred_by?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface AdminBotUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
      language_code?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data: string;
  };
}