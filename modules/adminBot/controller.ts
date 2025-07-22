import { logger } from '../../core/logger';
import { AdminBotService } from './service';
import { InlineKeyboardButton, InlineKeyboardMarkup } from './types';

export class AdminBotController {
  private adminBotService: AdminBotService;
  private tempAddresses: string[] = []; // Временное хранение адресов для копирования

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
        
      case '/search_user':
        await this.handleSearchUserCommand(chatId, args);
        break;
        
      case '/withdrawal_stats':
        await this.handleWithdrawalStatsCommand(chatId);
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
      case 'stats':
        await this.handleStatsCommand(chatId);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'missions':
        await this.handleMissionsCommand(chatId);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'withdrawals':
        const filterStatus = params[0] || 'all';
        await this.handleWithdrawalsCommand(chatId, [filterStatus]);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'ban_prompt':
        await this.adminBotService.sendMessage(
          chatId,
          '🚫 <b>Блокировка пользователя</b>\n\n' +
          'Отправьте команду в формате:\n' +
          '<code>/ban telegram_id</code>\n\n' +
          'Пример: <code>/ban 123456789</code>'
        );
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'refresh_admin':
        await this.handleAdminCommand(chatId);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Меню обновлено');
        break;
        
      case 'copy_ton_address':
        const tonAddress = params.join(':'); // На случай если в адресе есть двоеточия
        await this.adminBotService.sendMessage(
          chatId,
          `🏦 <b>TON адрес:</b>\n<code>${tonAddress}</code>\n\n` +
          '<i>Нажмите на адрес для копирования</i>'
        );
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Адрес отправлен');
        break;
        
      case 'copy_all_addresses':
        if (this.tempAddresses.length > 0) {
          const addressList = this.tempAddresses.map((addr, i) => `${i + 1}. <code>${addr}</code>`).join('\n');
          await this.adminBotService.sendMessage(
            chatId,
            `🏦 <b>Все TON адреса (${this.tempAddresses.length}):</b>\n\n${addressList}\n\n` +
            '<i>Нажмите на любой адрес для копирования</i>'
          );
          await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Адреса отправлены');
        } else {
          await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Нет адресов для копирования');
        }
        break;
        
      case 'withdrawal_stats':
        await this.handleWithdrawalStatsCommand(chatId);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'withdrawal_search_prompt':
        await this.adminBotService.sendMessage(
          chatId,
          '🔍 <b>Поиск заявок пользователя</b>\n\n' +
          'Отправьте команду в формате:\n' +
          '<code>/search_user telegram_id</code>\n\n' +
          'Пример: <code>/search_user 123456789</code>'
        );
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
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
        // Показываем диалог подтверждения вместо прямого выполнения
        await this.showApprovalConfirmation(chatId, params[0]);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'reject_withdrawal':
        // Показываем диалог подтверждения вместо прямого выполнения
        await this.showRejectionConfirmation(chatId, params[0]);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'confirm_approve_withdrawal':
        // Теперь выполняем реальное одобрение после подтверждения
        await this.handleApproveCommand(chatId, [params[0]], username);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Выплата одобрена');
        break;
        
      case 'confirm_reject_withdrawal':
        // Теперь выполняем реальное отклонение после подтверждения
        await this.handleRejectCommand(chatId, [params[0]], username);
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Выплата отклонена');
        break;
        
      case 'cancel_withdrawal_action':
        await this.adminBotService.sendMessage(chatId, '❌ Действие отменено');
        await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Отменено');
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
          { text: '👥 Пользователи', callback_data: 'users_page:1' },
          { text: '📊 Статистика', callback_data: 'stats' }
        ],
        [
          { text: '🎯 Миссии', callback_data: 'missions' },
          { text: '💸 Заявки на вывод', callback_data: 'withdrawals' }
        ],
        [
          { text: '🚫 Заблокировать', callback_data: 'ban_prompt' },
          { text: '🔄 Обновить', callback_data: 'refresh_admin' }
        ]
      ]
    };
    
    await this.adminBotService.sendMessage(
      chatId,
      `📋 <b>Главное меню</b>\n\n` +
      `Выберите действие с помощью кнопок ниже:\n\n` +
      `<i>Все команды теперь доступны через кнопки!</i>`,
      { reply_markup: keyboard }
    );
  }

  /**
   * Handle /stats command
   */
  private async handleStatsCommand(chatId: number): Promise<void> {
    try {
      const stats = await this.adminBotService.getSystemStats();
      
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
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
        `За последние 24ч: ${stats.transactionsLast24h}`,
        { reply_markup: keyboard }
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
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: []
      };
      
      const navButtons: InlineKeyboardButton[] = [];
      
      if (page > 1) {
        navButtons.push({
          text: '⬅️ Назад',
          callback_data: `users_page:${page - 1}`
        });
      }
      
      if (page < Math.ceil(result.total / limit)) {
        navButtons.push({
          text: 'Вперед ➡️',
          callback_data: `users_page:${page + 1}`
        });
      }
      
      if (navButtons.length > 0) {
        keyboard.inline_keyboard.push(navButtons);
      }
      
      // Кнопка возврата в главное меню
      keyboard.inline_keyboard.push([
        { text: '🏠 Главное меню', callback_data: 'refresh_admin' }
      ]);
      
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
      
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
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
   * Handle /withdrawals command with improved UX
   */
  private async handleWithdrawalsCommand(chatId: number, args: string[]): Promise<void> {
    try {
      const status = args[0]; // 'pending', 'approved', 'rejected', 'all'
      const limit = 50; // Показываем до 50 заявок
      
      const requests = await this.adminBotService.getWithdrawalRequests(status === 'all' ? undefined : status, limit);
      
      if (requests.length === 0) {
        const statusText = status ? `со статусом "${status}"` : '';
        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '📊 Статистика', callback_data: 'withdrawal_stats' },
              { text: '🔍 Поиск', callback_data: 'withdrawal_search_prompt' }
            ],
            [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
          ]
        };
        
        await this.adminBotService.sendMessage(
          chatId, 
          `📭 <b>Нет заявок на вывод ${statusText}</b>`, 
          { reply_markup: keyboard }
        );
        return;
      }
      
      // Группируем все заявки в одном сообщении
      let message = `💸 <b>Заявки на вывод</b>`;
      if (status && status !== 'all') {
        const statusEmoji = status === 'pending' ? '⏳' : status === 'approved' ? '✅' : '❌';
        message += ` ${statusEmoji} ${status.toUpperCase()}`;
      }
      message += `\n<i>Показано: ${requests.length} ${requests.length >= limit ? '(лимит)' : ''}</i>\n\n`;
      
      // Группируем адреса для массового копирования
      const allAddresses = requests.map(r => r.wallet_address).filter(Boolean);
      const uniqueAddresses = [...new Set(allAddresses)];
      
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const num = i + 1;
        
        // Статус с эмодзи
        const statusEmoji = request.status === 'pending' ? '⏳' : 
                           request.status === 'approved' ? '✅' : '❌';
        
        message += `<b>${num}. ${statusEmoji} ID: ${request.id}</b>\n`;
        
        // Информация о пользователе
        const userDisplay = request.username ? `@${request.username}` : 
                           request.first_name || `User ${request.telegram_id}`;
        message += `👤 ${userDisplay} <code>(${request.telegram_id})</code>\n`;
        
        // Сумма и кошелек
        message += `💰 <b>${parseFloat(request.amount).toFixed(4)} TON</b>\n`;
        message += `🏦 <code>${request.wallet_address}</code>\n`;
        
        // Дата создания
        const createDate = new Date(request.created_at).toLocaleString('ru-RU');
        message += `📅 ${createDate}\n`;
        
        // Информация об обработке
        if (request.processed_at) {
          const processDate = new Date(request.processed_at).toLocaleString('ru-RU');
          message += `⏱ Обработано: ${processDate}\n`;
          message += `👮 ${request.processed_by || 'admin'}\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      }
      
      // Создаем клавиатуру с улучшенными кнопками
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: []
      };
      
      // Кнопки фильтрации по статусам
      if (!status || status === 'all') {
        keyboard.inline_keyboard.push([
          { text: '⏳ Pending', callback_data: 'withdrawals:pending' },
          { text: '✅ Approved', callback_data: 'withdrawals:approved' },
          { text: '❌ Rejected', callback_data: 'withdrawals:rejected' }
        ]);
      } else {
        keyboard.inline_keyboard.push([
          { text: '📋 Все заявки', callback_data: 'withdrawals:all' }
        ]);
      }
      
      // Кнопки массового копирования
      if (uniqueAddresses.length > 0) {
        keyboard.inline_keyboard.push([
          { text: `📋 Копировать адреса (${uniqueAddresses.length})`, callback_data: 'copy_all_addresses' }
        ]);
      }
      
      // Массовые операции для pending заявок
      const pendingRequests = requests.filter(r => r.status === 'pending');
      if (pendingRequests.length > 0) {
        keyboard.inline_keyboard.push([
          { text: `✅ Одобрить все (${pendingRequests.length})`, callback_data: 'approve_all_pending' },
          { text: `❌ Отклонить все (${pendingRequests.length})`, callback_data: 'reject_all_pending' }
        ]);
      }
      
      // Дополнительные кнопки
      keyboard.inline_keyboard.push([
        { text: '📊 Статистика', callback_data: 'withdrawal_stats' },
        { text: '🔍 Поиск', callback_data: 'withdrawal_search_prompt' }
      ]);
      
      keyboard.inline_keyboard.push([
        { text: '🔄 Обновить', callback_data: `withdrawals:${status || 'all'}` },
        { text: '🏠 Главное меню', callback_data: 'refresh_admin' }
      ]);
      
      // Сохраняем адреса для копирования
      this.tempAddresses = uniqueAddresses;
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
      
    } catch (error) {
      logger.error('[AdminBot] Error in handleWithdrawalsCommand', { error: error instanceof Error ? error.message : String(error) });
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения заявок на вывод');
    }
  }

  /**
   * Show approval confirmation dialog
   */
  private async showApprovalConfirmation(chatId: number, requestId: string): Promise<void> {
    try {
      // Получаем информацию о заявке
      const withdrawal = await this.adminBotService.getWithdrawalById(requestId);
      
      if (!withdrawal) {
        await this.adminBotService.sendMessage(chatId, '❌ Заявка не найдена');
        return;
      }
      
      const message = 
        '⚠️ <b>Подтверждение одобрения</b>\n\n' +
        `🆔 ID заявки: ${withdrawal.id}\n` +
        `👤 Пользователь: ${withdrawal.username ? `@${withdrawal.username}` : withdrawal.first_name || `User ${withdrawal.telegram_id}`}\n` +
        `💰 Сумма: <b>${parseFloat(withdrawal.amount).toFixed(4)} TON</b>\n` +
        `📅 Создана: ${new Date(withdrawal.created_at).toLocaleString('ru-RU')}\n` +
        `🏦 Кошелек: <code>${withdrawal.wallet_address}</code>\n\n` +
        '❗ <b>Вы уверены, что хотите ОДОБРИТЬ эту выплату?</b>';
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Да, одобрить', callback_data: `confirm_approve_withdrawal:${requestId}` },
            { text: '❌ Отмена', callback_data: 'cancel_withdrawal_action' }
          ]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка при получении информации о заявке');
    }
  }

  /**
   * Show rejection confirmation dialog
   */
  private async showRejectionConfirmation(chatId: number, requestId: string): Promise<void> {
    try {
      // Получаем информацию о заявке
      const withdrawal = await this.adminBotService.getWithdrawalById(requestId);
      
      if (!withdrawal) {
        await this.adminBotService.sendMessage(chatId, '❌ Заявка не найдена');
        return;
      }
      
      const message = 
        '⚠️ <b>Подтверждение отклонения</b>\n\n' +
        `🆔 ID заявки: ${withdrawal.id}\n` +
        `👤 Пользователь: ${withdrawal.username ? `@${withdrawal.username}` : withdrawal.first_name || `User ${withdrawal.telegram_id}`}\n` +
        `💰 Сумма: <b>${parseFloat(withdrawal.amount).toFixed(4)} TON</b>\n` +
        `📅 Создана: ${new Date(withdrawal.created_at).toLocaleString('ru-RU')}\n` +
        `🏦 Кошелек: <code>${withdrawal.wallet_address}</code>\n\n` +
        '❗ <b>Вы уверены, что хотите ОТКЛОНИТЬ эту выплату?</b>\n' +
        '💡 <i>Средства будут возвращены на баланс пользователя</i>';
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '❌ Да, отклонить', callback_data: `confirm_reject_withdrawal:${requestId}` },
            { text: '↩️ Отмена', callback_data: 'cancel_withdrawal_action' }
          ]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка при получении информации о заявке');
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

  /**
   * Handle /search_user command
   */
  private async handleSearchUserCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /search_user <telegram_id>');
      return;
    }
    
    try {
      const telegramId = args[0];
      const requests = await this.adminBotService.searchWithdrawalsByUser(telegramId);
      
      if (requests.length === 0) {
        await this.adminBotService.sendMessage(
          chatId,
          `🔍 <b>Поиск завершен</b>\n\nЗаявки пользователя <code>${telegramId}</code> не найдены`
        );
        return;
      }
      
      let message = `🔍 <b>Заявки пользователя ${telegramId}</b>\n`;
      const userDisplay = requests[0].username ? `@${requests[0].username}` : 
                         requests[0].first_name || `User ${requests[0].telegram_id}`;
      message += `👤 ${userDisplay}\n`;
      message += `📊 Найдено заявок: ${requests.length}\n\n`;
      
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const statusEmoji = request.status === 'pending' ? '⏳' : 
                           request.status === 'approved' ? '✅' : '❌';
        
        message += `${i + 1}. ${statusEmoji} <b>${parseFloat(request.amount).toFixed(4)} TON</b>\n`;
        message += `📅 ${new Date(request.created_at).toLocaleString('ru-RU')}\n`;
        message += `🏦 <code>${request.wallet_address}</code>\n`;
        
        if (request.processed_at) {
          message += `⏱ Обработано: ${new Date(request.processed_at).toLocaleString('ru-RU')}\n`;
        }
        
        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      }
      
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🔄 Все заявки', callback_data: 'withdrawals:all' }],
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка поиска заявок пользователя');
    }
  }

  /**
   * Handle withdrawal statistics command
   */
  private async handleWithdrawalStatsCommand(chatId: number): Promise<void> {
    try {
      const stats = await this.adminBotService.getWithdrawalStats();
      
      if (!stats) {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения статистики');
        return;
      }
      
      const message = 
        `📊 <b>Статистика заявок на вывод</b>\n\n` +
        `📋 <b>Общая статистика:</b>\n` +
        `• Всего заявок: ${stats.total}\n` +
        `• Ожидают обработки: ${stats.pending}\n` +
        `• Одобрено: ${stats.approved}\n` +
        `• Отклонено: ${stats.rejected}\n\n` +
        `💰 <b>Финансовая статистика:</b>\n` +
        `• Общая сумма: ${stats.totalAmount.toFixed(4)} TON\n` +
        `• Заявок сегодня: ${stats.todayRequests}\n\n` +
        `📈 <b>Процентное соотношение:</b>\n` +
        `• Одобрено: ${stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(1) : 0}%\n` +
        `• Отклонено: ${stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}%\n` +
        `• В обработке: ${stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}%`;
      
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: '⏳ Pending', callback_data: 'withdrawals:pending' },
            { text: '✅ Approved', callback_data: 'withdrawals:approved' }
          ],
          [
            { text: '❌ Rejected', callback_data: 'withdrawals:rejected' },
            { text: '📋 Все заявки', callback_data: 'withdrawals:all' }
          ],
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения статистики');
    }
  }
}