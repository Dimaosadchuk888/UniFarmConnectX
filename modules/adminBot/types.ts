/**
 * Admin Bot types
 */

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: string;
  wallet_address: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  user?: {
    username?: string;
    telegram_id: string;
  };
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
  last_active?: string;
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