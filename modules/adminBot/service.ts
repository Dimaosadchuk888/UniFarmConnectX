import { adminBotConfig } from '../../config/adminBot';
import { logger } from '../../core/logger';
import { supabase } from '../../core/supabase';

export class AdminBotService {
  private botToken: string;
  private lastUpdateId: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.botToken = adminBotConfig.token;
    if (!this.botToken) {
      logger.error('[AdminBot] Bot token not configured');
    }
  }

  /**
   * Check if user is authorized admin by username
   */
  async isAuthorizedAdmin(username: string | undefined): Promise<boolean> {
    if (!username) return false;
    
    // Check against hardcoded admin list
    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;
    const isInList = adminBotConfig.authorizedAdmins.includes(normalizedUsername);
    
    if (!isInList) {
      logger.warn('[AdminBot] Unauthorized access attempt', { username });
      return false;
    }
    
    // Also check database is_admin flag
    try {
      const { data: user } = await supabase
        .from('users')
        .select('is_admin')
        .eq('username', username.replace('@', ''))
        .single();
        
      return user?.is_admin === true;
    } catch (error) {
      // If not in DB, still allow if in hardcoded list
      return true;
    }
  }

  /**
   * Send message via admin bot
   */
  async sendMessage(chatId: number, text: string, options: any = {}): Promise<boolean> {
    try {
      const response = await fetch(`${adminBotConfig.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          ...options
        })
      });

      const result = await response.json();
      return result.ok;
    } catch (error) {
      logger.error('[AdminBot] Error sending message', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Answer callback query
   */
  async answerCallbackQuery(callbackQueryId: string, text: string = ''): Promise<boolean> {
    try {
      const response = await fetch(`${adminBotConfig.apiUrl}/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text
        })
      });

      const result = await response.json();
      return result.ok;
    } catch (error) {
      logger.error('[AdminBot] Error answering callback query', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Setup webhook for admin bot
   */
  async setupWebhook(url: string): Promise<boolean> {
    try {
      logger.info('[AdminBot] Setting up webhook', { url });
      
      const response = await fetch(`${adminBotConfig.apiUrl}/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          allowed_updates: ['message', 'callback_query']
        })
      });

      const result = await response.json();
      logger.info('[AdminBot] Webhook setup result', { result });
      return result.ok;
    } catch (error) {
      logger.error('[AdminBot] Error setting up webhook', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Start polling for updates (fallback mode)
   */
  async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      return;
    }

    logger.info('[AdminBot] Starting polling mode');
    
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${adminBotConfig.apiUrl}/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=0`);
        const data = await response.json();
        
        if (data.ok && data.result.length > 0) {
          for (const update of data.result) {
            this.lastUpdateId = update.update_id;
            // Process update will be handled by controller
            const { AdminBotController } = await import('./controller');
            const controller = new AdminBotController();
            await controller.handleUpdate(update);
          }
        }
      } catch (error) {
        logger.error('[AdminBot] Polling error', { error: error instanceof Error ? error.message : String(error) });
      }
    }, 1000);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('[AdminBot] Polling stopped');
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    try {
      const { AdminService } = await import('../admin/service');
      const adminService = new AdminService();
      return await adminService.getDashboardStats();
    } catch (error) {
      logger.error('[AdminBot] Error getting system stats', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get users list
   */
  async getUsersList(page: number, limit: number): Promise<any> {
    try {
      const { AdminService } = await import('../admin/service');
      const adminService = new AdminService();
      return await adminService.getUsersList(page, limit);
    } catch (error) {
      logger.error('[AdminBot] Error getting users list', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(telegramId: string): Promise<any> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();
        
      if (error || !user) {
        throw new Error('User not found');
      }
      
      return user;
    } catch (error) {
      logger.error('[AdminBot] Error getting user info', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Ban user
   */
  async banUser(telegramId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('telegram_id', telegramId);
        
      if (error) {
        logger.error('[AdminBot] Error banning user', { error: error.message });
        return false;
      }
      
      logger.info('[AdminBot] User banned successfully', { telegramId });
      return true;
    } catch (error) {
      logger.error('[AdminBot] Error in ban user operation', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Get missions data
   */
  async getMissionsData(): Promise<any> {
    try {
      const { MissionsService } = await import('../missions/service');
      const missionsService = new MissionsService();
      
      const activeMissions = await missionsService.getActiveMissionsByTelegramId('admin');
      
      const { data: missionTransactions } = await supabase
        .from('transactions')
        .select('*')
        .in('type', ['MISSION_COMPLETE', 'MISSION_REWARD']);
      
      const totalCompletedMissions = missionTransactions?.filter(t => t.type === 'MISSION_COMPLETE').length || 0;
      const totalRewardsClaimed = missionTransactions?.filter(t => t.type === 'MISSION_REWARD').length || 0;
      const totalRewardsUni = missionTransactions
        ?.filter(t => t.type === 'MISSION_REWARD')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0) || 0;
      
      return {
        activeMissions,
        stats: {
          totalCompletedMissions,
          totalRewardsClaimed,
          totalRewardsUni: totalRewardsUni.toString()
        }
      };
    } catch (error) {
      logger.error('[AdminBot] Error getting missions data', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get withdrawal requests
   */
  async getWithdrawalRequests(status?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('withdrawal_requests')
        .select(`
          *,
          user:users!user_id(username, telegram_id)
        `)
        .order('created_at', { ascending: false });
        
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('[AdminBot] Error getting withdrawal requests', { error });
        return [];
      }
      
      return data || [];
    } catch (error) {
      logger.error('[AdminBot] Error in getWithdrawalRequests', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(requestId: string): Promise<boolean> {
    try {
      // Update request status
      const { data: request, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchError || !request) {
        logger.error('[AdminBot] Withdrawal request not found', { requestId });
        return false;
      }
      
      // Update status to approved
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);
        
      if (updateError) {
        logger.error('[AdminBot] Error approving withdrawal', { error: updateError });
        return false;
      }
      
      // TODO: Here you would integrate with actual TON wallet to send transaction
      logger.info('[AdminBot] Withdrawal approved', { requestId, amount: request.amount });
      
      return true;
    } catch (error) {
      logger.error('[AdminBot] Error in approveWithdrawal', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(requestId: string, reason?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'rejected',
          processed_at: new Date().toISOString(),
          admin_notes: reason || 'Rejected by admin'
        })
        .eq('id', requestId);
        
      if (error) {
        logger.error('[AdminBot] Error rejecting withdrawal', { error });
        return false;
      }
      
      logger.info('[AdminBot] Withdrawal rejected', { requestId });
      return true;
    } catch (error) {
      logger.error('[AdminBot] Error in rejectWithdrawal', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}