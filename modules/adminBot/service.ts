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
    
    // Also check database is_admin flag (handle multiple records)
    try {
      const { data: users } = await supabase
        .from('users')
        .select('is_admin, id')
        .eq('username', username.replace('@', ''))
        .order('created_at', { ascending: false }); // Get newest first
        
      // If any user with this username is admin, allow access
      return users && users.length > 0 && users.some(user => user.is_admin === true) || false;
    } catch (error) {
      logger.warn('[AdminBot] Database check failed, using hardcoded list', { username, error });
      // If DB check fails, still allow if in hardcoded list
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
   * Get withdrawal by ID with user information
   */
  async getWithdrawalById(requestId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select(`
          *,
          users!inner(
            telegram_id,
            username,
            first_name
          )
        `)
        .eq('id', requestId)
        .single();
        
      if (error) {
        logger.error('[AdminBot] Error getting withdrawal by id', { error });
        return null;
      }
      
      // Flatten user data
      return {
        ...data,
        telegram_id: data.users?.telegram_id,
        username: data.users?.username,
        first_name: data.users?.first_name
      };
    } catch (error) {
      logger.error('[AdminBot] Error in getWithdrawalById', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Get withdrawal requests with user information
   */
  async getWithdrawalRequests(status?: string, limit?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('withdraw_requests')
        .select(`
          *,
          users!inner(
            telegram_id,
            username,
            first_name
          )
        `)
        .order('created_at', { ascending: false });
        
      if (status) {
        query = query.eq('status', status);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('[AdminBot] Error getting withdrawal requests', { error });
        return [];
      }
      
      // Flatten user data for easier access
      const flattenedData = (data || []).map(request => ({
        ...request,
        telegram_id: request.users?.telegram_id,
        username: request.users?.username,
        first_name: request.users?.first_name
      }));
      
      return flattenedData;
    } catch (error) {
      logger.error('[AdminBot] Error in getWithdrawalRequests', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(requestId: string, adminUsername?: string): Promise<boolean> {
    try {
      // Update request status
      const { data: request, error: fetchError } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchError || !request) {
        logger.error('[AdminBot] Withdrawal request not found', { requestId });
        return false;
      }
      
      // Update status to approved
      const { error: updateError } = await supabase
        .from('withdraw_requests')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: adminUsername || 'admin'
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
  async rejectWithdrawal(requestId: string, adminUsername?: string): Promise<boolean> {
    try {
      // Сначала получаем информацию о заявке
      const { data: request, error: fetchError } = await supabase
        .from('withdraw_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchError || !request) {
        logger.error('[AdminBot] Withdrawal request not found', { requestId });
        return false;
      }
      
      // Проверяем, что заявка в статусе pending
      if (request.status !== 'pending') {
        logger.warn('[AdminBot] Cannot reject non-pending withdrawal', { requestId, status: request.status });
        return false;
      }
      
      // Возвращаем средства пользователю
      const { balanceManager } = await import('../../core/BalanceManager');
      const returnResult = await balanceManager.addBalance(
        request.user_id,
        0, // amount_uni
        parseFloat(request.amount), // amount_ton
        'AdminBot.rejectWithdrawal'
      );
      
      if (!returnResult.success) {
        logger.error('[AdminBot] Failed to return funds to user', { 
          requestId, 
          user_id: request.user_id,
          amount: request.amount_ton,
          error: returnResult.error 
        });
        return false;
      }
      
      // Обновляем статус заявки
      const { error: updateError } = await supabase
        .from('withdraw_requests')
        .update({ 
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: adminUsername || 'admin'
        })
        .eq('id', requestId);
        
      if (updateError) {
        logger.error('[AdminBot] Error updating withdrawal status', { error: updateError });
        // Пытаемся откатить возврат средств
        await balanceManager.subtractBalance(
          request.user_id,
          0,
          parseFloat(request.amount),
          'AdminBot.rejectWithdrawal.rollback'
        );
        return false;
      }
      
      logger.info('[AdminBot] Withdrawal rejected and funds returned', { 
        requestId, 
        user_id: request.user_id,
        amount_returned: request.amount 
      });
      
      return true;
    } catch (error) {
      logger.error('[AdminBot] Error in rejectWithdrawal', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Notify admin bot about new withdrawal request
   */
  async notifyWithdrawal(withdrawRequest: any): Promise<boolean> {
    try {
      logger.info('[AdminBot] Отправка уведомления о новой заявке на вывод', {
        requestId: withdrawRequest.id,
        userId: withdrawRequest.user_id,
        amount: withdrawRequest.amount_ton
      });

      // Получаем всех авторизованных админов
      const adminUsernames = adminBotConfig.authorizedAdmins;
      let notificationsSent = 0;

      for (const adminUsername of adminUsernames) {
        try {
          // Находим telegram_id админа в базе данных
          const cleanUsername = adminUsername.replace('@', '');
          const { data: adminUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('username', cleanUsername)
            .eq('is_admin', true)
            .limit(1)
            .maybeSingle();

          if (!adminUser?.telegram_id) {
            logger.warn('[AdminBot] Admin not found in database', { username: adminUsername });
            continue;
          }

          // Формируем сообщение уведомления
          const userDisplay = withdrawRequest.username ? `@${withdrawRequest.username}` : 
                             `User ${withdrawRequest.telegram_id}`;
          
          const message = `🔔 <b>НОВАЯ ЗАЯВКА НА ВЫВОД</b>

👤 <b>Пользователь:</b> ${userDisplay}
🆔 <b>ID заявки:</b> ${withdrawRequest.id}
💰 <b>Сумма:</b> ${withdrawRequest.amount_ton} TON
🏦 <b>Кошелек:</b> <code>${withdrawRequest.ton_wallet}</code>
📅 <b>Дата:</b> ${new Date(withdrawRequest.created_at).toLocaleString('ru-RU')}
⏳ <b>Статус:</b> Ожидает обработки

<i>Используйте /withdrawals для управления заявками</i>`;

          // Кнопки для быстрых действий
          const keyboard: any = {
            inline_keyboard: [
              [
                { text: '✅ Одобрить', callback_data: `approve_withdrawal:${withdrawRequest.id}` },
                { text: '❌ Отклонить', callback_data: `reject_withdrawal:${withdrawRequest.id}` }
              ],
              [
                { text: '📋 Все заявки', callback_data: 'withdrawals:pending' }
              ]
            ]
          };

          // Отправляем уведомление
          const success = await this.sendMessage(adminUser.telegram_id, message, { 
            reply_markup: keyboard 
          });

          if (success) {
            notificationsSent++;
            logger.info('[AdminBot] Уведомление отправлено', { 
              admin: adminUsername, 
              telegramId: adminUser.telegram_id 
            });
          } else {
            logger.warn('[AdminBot] Не удалось отправить уведомление', { 
              admin: adminUsername 
            });
          }

        } catch (error) {
          logger.error('[AdminBot] Ошибка отправки уведомления админу', { 
            admin: adminUsername, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      logger.info('[AdminBot] Уведомления о выводе отправлены', { 
        total: adminUsernames.length,
        sent: notificationsSent,
        requestId: withdrawRequest.id
      });

      return notificationsSent > 0;

    } catch (error) {
      logger.error('[AdminBot] Критическая ошибка отправки уведомления о выводе', { 
        error: error instanceof Error ? error.message : String(error),
        withdrawRequest: withdrawRequest?.id
      });
      return false;
    }
  }

  /**
   * Get withdrawal statistics
   */
  async getWithdrawalStats(): Promise<any> {
    try {
      const { data: allRequests, error } = await supabase
        .from('withdraw_requests')
        .select('status, amount_ton, created_at');
        
      if (error) {
        logger.error('[AdminBot] Error getting withdrawal stats', { error });
        return null;
      }
      
      const stats = {
        total: allRequests?.length || 0,
        pending: allRequests?.filter(r => r.status === 'pending').length || 0,
        approved: allRequests?.filter(r => r.status === 'approved').length || 0,
        rejected: allRequests?.filter(r => r.status === 'rejected').length || 0,
        totalAmount: allRequests?.reduce((sum, r) => sum + parseFloat(r.amount_ton || '0'), 0) || 0,
        todayRequests: allRequests?.filter(r => {
          const today = new Date();
          const requestDate = new Date(r.created_at);
          return requestDate.toDateString() === today.toDateString();
        }).length || 0
      };
      
      return stats;
    } catch (error) {
      logger.error('[AdminBot] Error in getWithdrawalStats', { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Search withdrawal requests by user telegram_id
   */
  async searchWithdrawalsByUser(telegramId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select(`
          *,
          users!inner(
            telegram_id,
            username,
            first_name
          )
        `)
        .eq('users.telegram_id', telegramId)
        .order('created_at', { ascending: false });
        
      if (error) {
        logger.error('[AdminBot] Error searching withdrawals by user', { error });
        return [];
      }
      
      return (data || []).map(request => ({
        ...request,
        telegram_id: request.users?.telegram_id,
        username: request.users?.username,
        first_name: request.users?.first_name
      }));
    } catch (error) {
      logger.error('[AdminBot] Error in searchWithdrawalsByUser', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}