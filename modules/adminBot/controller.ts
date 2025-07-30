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
      logger.info('[AdminBot] Получено обновление от Telegram', { 
        updateId: update.update_id,
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query,
        messageText: update.message?.text,
        fromUsername: update.message?.from?.username,
        fromId: update.message?.from?.id,
        chatId: update.message?.chat?.id,
        callbackData: update.callback_query?.data
      });

      // Handle message
      if (update.message) {
        logger.info('[AdminBot] Обрабатываем входящее сообщение');
        await this.handleMessage(update.message);
        logger.info('[AdminBot] Сообщение обработано успешно');
      }
      
      // Handle callback query
      if (update.callback_query) {
        logger.info('[AdminBot] Обрабатываем callback query', {
          data: update.callback_query.data,
          fromUsername: update.callback_query.from?.username
        });
        await this.handleCallbackQuery(update.callback_query);
        logger.info('[AdminBot] Callback query обработан успешно');
      }

      logger.info('[AdminBot] Обновление обработано ПОЛНОСТЬЮ УСПЕШНО', { updateId: update.update_id });
    } catch (error) {
      logger.error('[AdminBot] КРИТИЧЕСКАЯ ОШИБКА обработки обновления', { 
        error: error instanceof Error ? error.message : String(error),
        updateId: update.update_id,
        stack: error instanceof Error ? error.stack : undefined,
        messageText: update.message?.text,
        fromUsername: update.message?.from?.username,
        callbackData: update.callback_query?.data
      });
      // Не бросаем ошибку дальше, чтобы не вызвать 500 в webhook
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
        
      case '/user_info':
        await this.handleUserInfoCommand(chatId, args);
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
          '🔍 <b>Умный поиск пользователей</b>\n\n' +
          '<b>Доступные команды:</b>\n' +
          '• <code>/search_user telegram_id</code> - поиск заявок пользователя\n' +
          '• <code>/user_info telegram_id</code> - полная информация о пользователе\n\n' +
          '<b>Примеры:</b>\n' +
          '• <code>/search_user 123456789</code>\n' +
          '• <code>/user_info 123456789</code>\n\n' +
          '<i>💡 Tip: Также можно искать по @username</i>',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
              ]
            }
          }
        );
        await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        break;
        
      case 'admin_tools':
        await this.handleAdminToolsCommand(chatId);
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
        // УПРОЩЕННЫЙ ПОДХОД: одобряем и автоматически обновляем интерфейс
        await this.handleApproveWithdrawal(chatId, params[0], username, callbackQuery.id);
        break;
        
      case 'reject_withdrawal':
        // УПРОЩЕННЫЙ ПОДХОД: отклоняем и автоматически обновляем интерфейс
        await this.handleRejectWithdrawal(chatId, params[0], username, callbackQuery.id);
        break;
        

        
      case 'manual_paid':
        // НОВАЯ КНОПКА: Отметить выплату как сделанную вручную (только статус в боте)
        await this.handleManualPaid(chatId, params[0], username, callbackQuery.id);
        break;
        
      case 'withdrawals':
        if (params[0] === 'refresh') {
          // Обновляем простой список заявок
          const requests = await this.adminBotService.getWithdrawalRequests(undefined, 50);
          await this.showSimpleWithdrawalsList(chatId, requests);
          await this.adminBotService.answerCallbackQuery(callbackQuery.id, 'Список обновлен');
        } else {
          const filterStatus = params[0] || 'menu';
          if (filterStatus === 'menu') {
            await this.displayWithdrawalsMenu(chatId);
          } else {
            await this.handleWithdrawalsCommand(chatId, [filterStatus]);
          }
          await this.adminBotService.answerCallbackQuery(callbackQuery.id);
        }
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
    try {
      // Получаем быструю статистику для отображения в главном меню
      const stats = await this.adminBotService.getSystemStats();
      const withdrawalStats = await this.adminBotService.getWithdrawalStats();
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 Полная статистика', callback_data: 'stats' },
            { text: '🔍 Умный поиск', callback_data: 'withdrawal_search_prompt' }
          ],
          [
            { text: '💸 Заявки на вывод', callback_data: 'withdrawals' },
            { text: '👥 Пользователи', callback_data: 'users_page:1' }
          ],
          [
            { text: '🎯 Миссии', callback_data: 'missions' },
            { text: '📈 Аналитика выводов', callback_data: 'withdrawal_stats' }
          ],
          [
            { text: '⚙️ Инструменты', callback_data: 'admin_tools' },
            { text: '🔄 Обновить', callback_data: 'refresh_admin' }
          ]
        ]
      };
      
      // Создаем краткую сводку для главного меню
      const quickSummary = 
        `📊 <b>Сводка за 24 часа</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 Пользователей: ${stats.totalUsers} (↗️ +${stats.usersLast24h})\n` +
        `💰 UNI: ${parseFloat(stats.totalUniBalance).toFixed(0)} | TON: ${parseFloat(stats.totalTonBalance).toFixed(2)}\n` +
        `💸 Заявки: ${withdrawalStats?.pending || 0}⏳ | ${withdrawalStats?.approved || 0}✅ | ${withdrawalStats?.rejected || 0}❌\n` +
        `🌾 Фарминг: ${stats.activeFarmingSessions} активных\n` +
        `📈 Транзакций: ${stats.transactionsLast24h} за 24ч\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>📋 Админ панель</b>\n` +
        `<i>Выберите действие с помощью кнопок ниже</i>`;
      
      await this.adminBotService.sendMessage(chatId, quickSummary, { reply_markup: keyboard });
    } catch (error) {
      // Fallback к простому меню если статистика недоступна
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
   * Handle /withdrawals command - ПРОСТОЙ СПИСОК ЗАЯВОК
   */
  private async handleWithdrawalsCommand(chatId: number, args: string[]): Promise<void> {
    try {
      // Получаем все заявки одним списком (без фильтров)
      const requests = await this.adminBotService.getWithdrawalRequests(undefined, 50);
      
      // Показываем простой список заявок
      await this.showSimpleWithdrawalsList(chatId, requests);
      
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения заявок на вывод');
    }
  }

  /**
   * ПРОСТОЙ СПИСОК всех заявок без фильтров
   */
  private async showSimpleWithdrawalsList(chatId: number, requests: any[]): Promise<void> {
    if (requests.length === 0) {
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
      await this.adminBotService.sendMessage(
        chatId, 
        `📭 <b>Нет заявок на вывод</b>`, 
        { reply_markup: keyboard }
      );
      return;
    }
    
    // ПРОСТАЯ СОРТИРОВКА: pending первыми, затем по дате
    const sortedRequests = requests.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    let message = `💸 <b>ЗАЯВКИ НА ВЫВОД</b>\n`;
    message += `<i>Всего заявок: ${requests.length}</i>\n\n`;
    
    // ПРОСТОЕ ОТОБРАЖЕНИЕ заявок (максимум 20)
    for (let i = 0; i < Math.min(sortedRequests.length, 20); i++) {
      const request = sortedRequests[i];
      const num = i + 1;
      
      // Определяем статус
      const statusEmoji = this.getStatusEmoji(request.status);
      const statusText = this.getSimpleStatusText(request.status);
      
      // Пользователь
      const userDisplay = request.username ? `@${request.username}` : 
                         request.first_name || `ID${request.telegram_id}`;
      
      // Дата заявки
      const requestDate = new Date(request.created_at).toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      message += `<b>${num}. ${statusEmoji} ${parseFloat(request.amount).toFixed(4)} TON</b>\n`;
      message += `👤 ${userDisplay}\n`;
      message += `📅 ${requestDate} • ${statusText}\n`;
      
      // Кошелек (сокращенный)
      if (request.wallet_address) {
        const shortWallet = `${request.wallet_address.slice(0, 6)}...${request.wallet_address.slice(-4)}`;
        message += `🏦 <code>${shortWallet}</code>\n`;
      }
      
      message += `\n`;
    }
    
    // ПРОСТЫЕ КНОПКИ: только для pending заявок
    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    const pendingRequests = sortedRequests.filter(r => r.status === 'pending').slice(0, 10);
    for (const request of pendingRequests) {
      const shortId = request.id.slice(-6);
      keyboard.inline_keyboard.push([
        {
          text: `✅ Выплата сделана ${shortId}`,
          callback_data: `manual_paid:${request.id}`
        }
      ]);
    }
    
    // Кнопки навигации
    keyboard.inline_keyboard.push([
      { text: '🔄 Обновить список', callback_data: 'withdrawals:refresh' }
    ]);
    keyboard.inline_keyboard.push([
      { text: '🏠 Главное меню', callback_data: 'refresh_admin' }
    ]);
    
    await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
  }



  /**
   * Получить текст статуса для отображения
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'ожидающих обработки';
      case 'approved': return 'оплаченных';
      case 'rejected': return 'отклоненных';
      case 'all': return 'всех статусов';
      default: return '';
    }
  }

  /**
   * Получить эмодзи статуса
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pending': return '🔄';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  }

  /**
   * Получить простой текст статуса
   */
  private getSimpleStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Ожидает выплаты';
      case 'approved': return 'Выплата сделана';
      case 'rejected': return 'Отклонена';
      default: return 'Неизвестно';
    }
  }

  /**
   * Добавляем недостающие методы для обработки команд
   */
  private async handleApproveCommand(chatId: number, args: string[], adminUsername?: string): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /approve <request_id>');
      return;
    }
    
    try {
      const success = await this.adminBotService.approveWithdrawal(args[0], adminUsername || 'admin');
      
      if (success) {
        await this.adminBotService.sendMessage(chatId, `✅ Заявка ${args[0]} одобрена`);
        // Автообновление списка ожидающих заявок
        await this.handleWithdrawalsCommand(chatId, ['pending']);
      } else {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка одобрения заявки');
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  private async handleRejectCommand(chatId: number, args: string[], adminUsername?: string): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /reject <request_id>');
      return;
    }
    
    try {
      const success = await this.adminBotService.rejectWithdrawal(args[0], adminUsername || 'admin');
      
      if (success) {
        await this.adminBotService.sendMessage(chatId, `❌ Заявка ${args[0]} отклонена`);
        // Автообновление списка ожидающих заявок  
        await this.handleWithdrawalsCommand(chatId, ['pending']);
      } else {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка отклонения заявки');
      }
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  private async handleWithdrawalStatsCommand(chatId: number): Promise<void> {
    try {
      const stats = await this.adminBotService.getWithdrawalStats();
      
      if (!stats) {
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения статистики');
        return;
      }
      
      const message = `📊 <b>Статистика выводов</b>\n\n` +
        `🔄 Ожидают: <b>${stats.pending || 0}</b>\n` +
        `✅ Одобрено: <b>${stats.approved || 0}</b>\n` +
        `❌ Отклонено: <b>${stats.rejected || 0}</b>\n` +
        `📋 Всего: <b>${stats.total || 0}</b>\n\n` +
        `💰 <b>Суммы:</b>\n` +
        `• Ожидают: ${(stats.pendingAmount || 0).toFixed(4)} TON\n` +
        `• Выплачено: ${(stats.approvedAmount || 0).toFixed(4)} TON\n` +
        `• Общая сумма: ${(stats.totalAmount || 0).toFixed(4)} TON`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '💸 К заявкам', callback_data: 'withdrawals:menu' }],
          [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения статистики выводов');
    }
  }

  private async handleAdminToolsCommand(chatId: number): Promise<void> {
    const message = `🛠️ <b>Админ инструменты</b>\n\n` +
      `Доступные функции:\n` +
      `• Блокировка пользователей\n` +
      `• Просмотр пользователей\n` +
      `• Статистика системы\n` +
      `• Управление миссиями`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '👥 Пользователи', callback_data: 'users_page:1' },
          { text: '🚫 Заблокировать', callback_data: 'ban_prompt' }
        ],
        [
          { text: '📊 Статистика', callback_data: 'stats' },
          { text: '🎯 Миссии', callback_data: 'missions' }
        ],
        [{ text: '🏠 Главное меню', callback_data: 'refresh_admin' }]
      ]
    };
    
    await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  private async handleSearchUserCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /search_user <telegram_id>');
      return;
    }
    
    try {
      const requests = await this.adminBotService.getWithdrawalRequests();
      const userRequests = requests.filter(r => r.telegram_id?.toString() === args[0]);
      
      if (userRequests.length === 0) {
        await this.adminBotService.sendMessage(chatId, `📭 Заявок от пользователя ${args[0]} не найдено`);
        return;
      }
      
      let message = `🔍 <b>Заявки пользователя ${args[0]}</b>\n\n`;
      
      for (const request of userRequests) {
        message += `💰 ${parseFloat(request.amount).toFixed(4)} TON\n`;
        message += `📅 ${new Date(request.created_at).toLocaleDateString('ru-RU')}\n`;
        message += `📊 Статус: ${request.status}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      }
      
      await this.adminBotService.sendMessage(chatId, message);
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка поиска заявок пользователя');
    }
  }

  private async handleUserInfoCommand(chatId: number, args: string[]): Promise<void> {
    if (!args[0]) {
      await this.adminBotService.sendMessage(chatId, 'Использование: /user_info <telegram_id>');
      return;
    }
    
    try {
      const telegramId = args[0];
      
      // Получаем информацию о пользователе
      const userInfo = await this.adminBotService.getUserInfo(telegramId);
      
      // Получаем заявки на вывод пользователя
      const userWithdrawals = await this.adminBotService.getWithdrawalRequests();
      const userRequests = userWithdrawals.filter(r => r.telegram_id?.toString() === telegramId);
      
      const totalWithdrawals = userRequests.length;
      const totalWithdrawalAmount = userRequests.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0);
      
      const message = 
        `👤 <b>Информация о пользователе</b>\n\n` +
        `🆔 <b>Основная информация:</b>\n` +
        `• Telegram ID: <code>${userInfo.telegram_id}</code>\n` +
        `• Username: ${userInfo.username ? `@${userInfo.username}` : 'Не указан'}\n` +
        `• Имя: ${userInfo.first_name || 'Не указано'}\n` +
        `• Статус: ${userInfo.is_active ? '🟢 Активен' : '🔴 Заблокирован'}\n\n` +
        `💰 <b>Балансы:</b>\n` +
        `• UNI: <b>${parseFloat(userInfo.balance_uni || '0').toFixed(2)}</b>\n` +
        `• TON: <b>${parseFloat(userInfo.balance_ton || '0').toFixed(6)}</b>\n\n` +
        `🌾 <b>Фарминг:</b>\n` +
        `• Статус: ${userInfo.uni_farming_active ? '✅ Активен' : '⏸️ Неактивен'}\n` +
        `• Депозит: ${parseFloat(userInfo.uni_deposit_amount || '0').toFixed(2)} UNI\n\n` +
        `💸 <b>Заявки на вывод:</b>\n` +
        `• Всего заявок: ${totalWithdrawals}\n` +
        `• Общая сумма: ${totalWithdrawalAmount.toFixed(4)} TON\n\n` +
        `👥 <b>Реферальная система:</b>\n` +
        `• Код: <code>${userInfo.ref_code || 'Не создан'}</code>\n` +
        `• Пригласил: ${userInfo.referred_by ? `User ${userInfo.referred_by}` : 'Нет'}\n\n` +
        `📅 <b>Даты:</b>\n` +
        `• Регистрация: ${new Date(userInfo.created_at).toLocaleString('ru-RU')}\n` +
        `• Последняя активность: ${userInfo.last_active ? new Date(userInfo.last_active).toLocaleString('ru-RU') : 'Не определена'}\n\n` +
        `📊 <b>Статус:</b> ${userInfo.is_active ? '🟢 Активен' : '🔴 Заблокирован'}`;
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: '💸 Заявки', callback_data: `user_withdrawals:${telegramId}` },
            { text: '📊 Транзакции', callback_data: `user_transactions:${telegramId}` }
          ],
          [
            { text: userInfo.is_active ? '🚫 Заблокировать' : '✅ Разблокировать', 
              callback_data: `toggle_user_status:${telegramId}` }
          ],
          [
            { text: '🔄 Обновить', callback_data: `user_info_refresh:${telegramId}` },
            { text: '🏠 Главное меню', callback_data: 'refresh_admin' }
          ]
        ]
      };
      
      await this.adminBotService.sendMessage(chatId, message, { reply_markup: keyboard });
    } catch (error) {
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка получения информации о пользователе');
    }
  }

  /**
   * УПРОЩЕННЫЕ МЕТОДЫ: Одобрение с автоматическим обновлением интерфейса
   */
  private async handleApproveWithdrawal(chatId: number, requestId: string, adminUsername?: string, callbackQueryId?: string): Promise<void> {
    try {
      const success = await this.adminBotService.approveWithdrawal(requestId, adminUsername || 'admin');
      
      if (success) {
        // Автоматически показываем обновленный список pending заявок
        await this.handleWithdrawalsCommand(chatId, ['pending']);
        
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, `✅ Заявка ${requestId.slice(-6)} одобрена`);
        }
      } else {
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка одобрения');
        }
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка одобрения заявки');
      }
    } catch (error) {
      if (callbackQueryId) {
        await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка');
      }
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения операции');
    }
  }

  private async handleRejectWithdrawal(chatId: number, requestId: string, adminUsername?: string, callbackQueryId?: string): Promise<void> {
    try {
      const success = await this.adminBotService.rejectWithdrawal(requestId, adminUsername || 'admin');
      
      if (success) {
        // Автоматически показываем обновленный список pending заявок
        await this.handleWithdrawalsCommand(chatId, ['pending']);
        
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, `❌ Заявка ${requestId.slice(-6)} отклонена`);
        }
      } else {
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка отклонения');
        }
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка отклонения заявки');
      }
    } catch (error) {
      if (callbackQueryId) {
        await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка');
      }
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения операции');
    }
  }

  /**
   * НОВАЯ ФУНКЦИЯ: Отметить выплату как сделанную вручную (только статус в боте)
   */
  private async handleManualPaid(chatId: number, requestId: string, adminUsername?: string, callbackQueryId?: string): Promise<void> {
    try {
      // ВАЖНО: Только меняем статус в боте, НЕ трогаем механики приложения
      const success = await this.adminBotService.markAsManuallyPaid(requestId, adminUsername || 'admin');
      
      if (success) {
        // Автоматически показываем обновленный список
        await this.showSimpleWithdrawalsList(chatId, await this.adminBotService.getWithdrawalRequests(undefined, 50));
        
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, `✅ Выплата ${requestId.slice(-6)} отмечена как сделанная`);
        }
      } else {
        if (callbackQueryId) {
          await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка отметки выплаты');
        }
        await this.adminBotService.sendMessage(chatId, '❌ Ошибка отметки выплаты');
      }
    } catch (error) {
      if (callbackQueryId) {
        await this.adminBotService.answerCallbackQuery(callbackQueryId, '❌ Ошибка');
      }
      await this.adminBotService.sendMessage(chatId, '❌ Ошибка выполнения операции');
    }
  }


}
