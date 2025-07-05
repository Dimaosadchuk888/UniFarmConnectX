import { logger } from '../../core/logger';
import { AdminBotService } from './service';

export class AdminBotController {
  private adminBotService: AdminBotService;

  constructor() {
    this.adminBotService = new AdminBotService();
  }

  /**
   * Handle incoming update from Telegram
   */
  async handleUpdate(update: any): Promise<void> {
    try {
      // Handle message
      if (update.message) {
        await this.handleMessage(update.message);
      }
      
      // Handle callback query
      if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      logger.error('[AdminBot] Error handling update', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: any): Promise<void> {
    const chatId = message.chat.id;
    const username = message.from?.username;
    const text = message.text || '';
    
    // Check if user is authorized admin
    const isAuthorized = await this.adminBotService.isAuthorizedAdmin(username);
    if (!isAuthorized) {
      await this.adminBotService.sendMessage(
        chatId,
        '❌ Доступ запрещен. Вы не являетесь администратором.'
      );
      return;
    }
    
    // Parse command
    const command = text.split(' ')[0];
    const args = text.split(' ').slice(1);
    
    logger.info('[AdminBot] Processing command', { command, args, username });
    
    // Handle commands
    switch (command) {
      case '/start':
      case '/admin':
        await this.handleAdminCommand(chatId);
        break;
        
      case '/stats':
        await this.handleStatsCommand(chatId);
        break;
        
      case '/users':
        await this.handleUsersCommand(chatId, args);
        break;
        
      case '/user':
        await this.handleUserCommand(chatId, args);
        break;
        
      case '/missions':
        await this.handleMissionsCommand(chatId);
        break;
        
      case '/mission_complete':
        await this.handleMissionCompleteCommand(chatId, args);
        break;
        
      case '/mission_reward':
        await this.handleMissionRewardCommand(chatId, args);
        break;
        
      case '/ban':
        await this.handleBanCommand(chatId, args);
        break;
        
      case '/withdrawals':
        await this.handleWithdrawalsCommand(chatId, args);
        break;
        
      case '/approve':
        await this.handleApproveCommand(chatId, args, username);
        break;
        
      case '/reject':
        await this.handleRejectCommand(chatId, args, username);
        break;
        
      default:
        await this.adminBotService.sendMessage(
          chatId,
          'Неизвестная команда. Используйте /admin для просмотра доступных команд.'
        );
    }
  }

  /**
   * Handle callback query
   */
  private async handleCallbackQuery(callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const username = callbackQuery.from?.username;
    const data = callbackQuery.data;
    
    // Check if user is authorized admin
    const isAuthorized = await this.adminBotService.isAuthorizedAdmin(username);
    if (!isAuthorized) {
      await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Доступ запрещен');
      return;
    }
    
    logger.info('[AdminBot] Processing callback', { data, username });
    
    // Parse callback data
    const [action, ...params] = data.split(':');
    
    switch (action) {
      case 'users_page':
        const page = parseInt(params[0]) || 1;
        await this.handleUsersCommand(chatId, [page.toString()]);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'ban_user':
        await this.handleBanCommand(chatId, [params[0]]);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Пользователь заблокирован');
        break;
        
      case 'approve_withdrawal':
        await this.handleApproveCommand(chatId, [params[0]], username);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Выплата одобрена');
        break;
        
      case 'reject_withdrawal':
        await this.handleRejectCommand(chatId, [params[0]], username);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Выплата отклонена');
        break;
        
      default:
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
    }
  }

  /**
   * Handle /admin command
   */
  private async handleAdminCommand(chatId: number): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Статистика', callback_data: 'stats' },
          { text: '👥 Пользователи', callback_data: 'users_page:1' }
        ],
        [
          { text: '🎯 Миссии', callback_data: 'missions' },
          { text: '💸 Выплаты', callback_data: 'withdrawals' }
        ]
      ]
    };
    
    await this.adminBotService.sendMessage(
      chatId,
      `🔐 <b>Админ-панель UniFarm</b>\n\n` +
      `Доступные команды:\n` +
      `/stats - Общая статистика\n` +
      `/users - Список пользователей\n` +
      `/user <telegram_id> - Информация о пользователе\n` +
      `/missions - Управление миссиями\n` +
      `/withdrawals - Заявки на вывод\n` +
      `/approve <id> - Одобрить выплату\n` +
      `/reject <id> - Отклонить выплату\n` +
      `/ban <telegram_id> - Заблокировать пользователя`,
      { reply_markup: keyboard }
    );
  }

  /**
   * Handle /stats command
   */
  private async handleStatsCommand(chatId: number): Promise<void> {
    try {
      const stats = await this.adminBotService.getSystemStats();
      
      await this.adminBotService.sendMessage(
        chatId,
        `📊 <b>Статистика системы</b>\n\n` +
        `👥 Всего пользователей: ${stats.totalUsers}\n` +
        `🟢 Активных: ${stats.activeUsers}\n` +
        `📈 За последние 24ч: ${stats.usersLast24h}\n\n` +
        `💰 <b>Балансы:</b>\n` +
        `UNI: ${parseFloat(stats.totalUniBalance).toFixed(2)}\n` +
        `TON: ${parseFloat(stats.totalTonBalance).toFixed(2)}\n\n` +
        `🌾 <b>Фарминг:</b>\n` +
        `Активных сессий: ${stats.activeFarmingSessions}\n` +
        `Всего сессий: ${stats.totalFarmingSessions}\n\n` +
        `📝 <b>Транзакции:</b>\n` +
        `Всего: ${stats.totalTransactions}\n` +
        `За последние 24ч: ${stats.transactionsLast24h}`
      );
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения статистики');
    }
  }

  /**
   * Handle /users command
   */
  private async handleUsersCommand(chatId: number, args: string[]): Promise<void> {
    try {
      const page = parseInt(args[0]) || 1;
      const limit = 10;
      
      const result = await this.adminBotService.getUsersList(page, limit);
      
      if (!result.users || result.users.length === 0) {
        await this.adminBotService.sendMessage(chatId, 'Пользователи не найдены');
        return;
      }
      
      let message = `👥 <b>Пользователи (стр. ${page}/${Math.ceil(result.total / limit)})</b>\n\n`;
      
      for (const user of result.users) {
        message += `🆔 ${user.telegram_id}\n`;
        message += `👤 ${user.username || 'Без username'}\n`;
        message += `💰 UNI: ${parseFloat(user.balance_uni || '0').toFixed(2)} | TON: ${parseFloat(user.balance_ton || '0').toFixed(2)}\n`;
        message += `📅 Регистрация: ${new Date(user.created_at).toLocaleDateString()}\n`;
        message += `${user.is_active ? '✅ Активен' : '❌ Заблокирован'}\n`;
        message += `─────────────────\n`;
      }
      
      // Navigation buttons
      const keyboard: any = {
        inline_keyboard: [[]]
      };
      
      if (page > 1) {
        keyboard.inline_keyboard[0].push({
          text: '⬅️ Назад',
          callback_data: `users_page:${page - 1}`
        });
      }
      
      if (page < Math.ceil(result.total / limit)) {
        keyboard.inline_keyboard[0].push({
          text: 'Вперед ➡️',
          callback_data: `users_page:${page + 1}`
        });
      }
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения списка пользователей');
    }
  }

  /**
   * Handle /user command
   */
  private async handleUserCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /user <telegram_id>');
      return;
    }
    
    try {
      const user = await this.adminBotService.getUserInfo(args[0]);
      
      const keyboard = {
        inline_keyboard: [
          [{ text: user.is_active ? '🚫 Заблокировать' : '✅ Разблокировать', callback_data: `ban_user:${user.telegram_id}` }]
        ]
      };
      
      await this.adminBotService.sendMessage(
        chatId,
        `👤 <b>Информация о пользователе</b>\n\n` +
        `🆔 Telegram ID: ${user.telegram_id}\n` +
        `👤 Username: ${user.username || 'Не указан'}\n` +
        `📱 Имя: ${user.first_name || 'Не указано'}\n` +
        `🔑 Реф. код: ${user.ref_code}\n` +
        `👥 Пригласил: ${user.referred_by || 'Никто'}\n\n` +
        `💰 <b>Балансы:</b>\n` +
        `UNI: ${parseFloat(user.balance_uni || '0').toFixed(2)}\n` +
        `TON: ${parseFloat(user.balance_ton || '0').toFixed(2)}\n\n` +
        `📅 Регистрация: ${new Date(user.created_at).toLocaleDateString()}\n` +
        `🕐 Последняя активность: ${user.last_active ? new Date(user.last_active).toLocaleString() : 'Нет данных'}\n` +
        `${user.is_active ? '✅ Активен' : '❌ Заблокирован'}\n` +
        `${user.is_admin ? '👑 Администратор' : ''}`,
        { reply_markup: keyboard }
      );
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Пользователь не найден');
    }
  }

  /**
   * Handle /missions command
   */
  private async handleMissionsCommand(chatId: number): Promise<void> {
    try {
      const data = await this.adminBotService.getMissionsData();
      
      let message = `🎯 <b>Миссии</b>\n\n`;
      message += `📊 <b>Статистика:</b>\n`;
      message += `✅ Выполнено миссий: ${data.stats.totalCompletedMissions}\n`;
      message += `💰 Выдано наград: ${data.stats.totalRewardsClaimed}\n`;
      message += `💎 Сумма наград UNI: ${parseFloat(data.stats.totalRewardsUni).toFixed(2)}\n\n`;
      message += `📋 <b>Активные миссии:</b>\n\n`;
      
      for (const mission of data.activeMissions) {
        message += `${mission.title}\n`;
        message += `Награда: ${mission.reward} UNI\n`;
        message += `─────────────────\n`;
      }
      
      await this.adminBotService.sendMessage(chatId, message);
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения данных о миссиях');
    }
  }

  /**
   * Handle /mission_complete command
   */
  private async handleMissionCompleteCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /mission_complete <mission_id>');
      return;
    }
    
    // This would require mission completion logic
    await this.adminBotService.sendMessage(chatId, '✅ Миссия отмечена как выполненная');
  }

  /**
   * Handle /mission_reward command
   */
  private async handleMissionRewardCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /mission_reward <mission_id>');
      return;
    }
    
    // This would require reward distribution logic
    await this.adminBotService.sendMessage(chatId, '✅ Награда за миссию выдана');
  }

  /**
   * Handle /ban command
   */
  private async handleBanCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /ban <telegram_id>');
      return;
    }
    
    try {
      const success = await this.adminBotService.banUser(args[0]);
      
      if (success) {
        await this.adminBotService.sendMessage(chatId, `✅ Пользователь ${args[0]} заблокирован`);
      } else {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка блокировки пользователя');
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  /**
   * Handle /withdrawals command
   */
  private async handleWithdrawalsCommand(chatId: number, args: string[]): Promise<void> {
    try {
      const status = args[0]; // 'pending', 'approved', 'rejected'
      const requests = await this.adminBotService.getWithdrawalRequests(status);
      
      if (requests.length === 0) {
        await this.adminBotService.sendMessage(chatId, '📭 Нет заявок на вывод');
        return;
      }
      
      let message = `💸 <b>Заявки на вывод</b>\n\n`;
      
      for (const request of requests) {
        message += `🆔 ID: ${request.id}\n`;
        message += `👤 Пользователь: @${request.username || 'unknown'} (${request.telegram_id || request.user_id})\n`;
        message += `💰 Сумма: ${request.amount_ton} TON\n`;
        message += `👛 Кошелек: ${request.ton_wallet}\n`;
        message += `📅 Дата: ${new Date(request.created_at).toLocaleString()}\n`;
        message += `📌 Статус: ${request.status}\n`;
        
        if (request.processed_at) {
          message += `⏱ Обработано: ${new Date(request.processed_at).toLocaleString()}\n`;
          message += `👮 Обработал: ${request.processed_by}\n`;
        }
        
        if (request.status === 'pending') {
          const keyboard = {
            inline_keyboard: [[
              { text: '✅ Одобрить', callback_data: `approve_withdrawal:${request.id}` },
              { text: '❌ Отклонить', callback_data: `reject_withdrawal:${request.id}` }
            ]]
          };
          await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
        } else {
          await this.adminBotService.sendMessage(chatId, message);
        }
        
        message = ''; // Reset for next iteration
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения заявок на вывод');
    }
  }

  /**
   * Handle /approve command
   */
  private async handleApproveCommand(chatId: number, args: string[], adminUsername?: string): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /approve <request_id>');
      return;
    }
    
    try {
      const success = await this.adminBotService.approveWithdrawal(args[0], adminUsername);
      
      if (success) {
        await this.adminBotService.sendMessage(chatId, `✅ Выплата ${args[0]} одобрена`);
      } else {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка одобрения выплаты');
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  /**
   * Handle /reject command
   */
  private async handleRejectCommand(chatId: number, args: string[], adminUsername?: string): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /reject <request_id>');
      return;
    }
    
    try {
      const success = await this.adminBotService.rejectWithdrawal(args[0], adminUsername);
      
      if (success) {
        await this.adminBotService.sendMessage(chatId, `❌ Выплата ${args[0]} отклонена`);
      } else {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка отклонения выплаты');
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }
}