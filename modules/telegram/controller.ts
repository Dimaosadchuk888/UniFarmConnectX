import type { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../core/BaseController';
import { logger } from '../../core/logger.js';
import { TelegramService } from './service';

export class TelegramController extends BaseController {
  private telegramService: TelegramService;

  constructor() {
    super();
    this.telegramService = new TelegramService();
  }

  async debugMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const telegramData = (req as any).telegram;
      const headers = {
        'x-telegram-init-data': req.headers['x-telegram-init-data'],
        'x-telegram-user-id': req.headers['x-telegram-user-id'],
        'telegram-init-data': req.headers['telegram-init-data']
      };
      
      logger.info('[TelegramDebug] Состояние middleware', {
        has_telegram: !!telegramData,
        validated: telegramData?.validated,
        has_user: !!telegramData?.user,
        user_id: telegramData?.user?.id,
        telegram_id: telegramData?.user?.telegram_id
      });
      
      this.sendSuccess(res, {
        middleware_active: !!telegramData,
        validated: telegramData?.validated || false,
        user_present: !!telegramData?.user,
        user_data: telegramData?.user ? {
          id: telegramData.user.id,
          telegram_id: telegramData.user.telegram_id,
          username: telegramData.user.username,
          ref_code: telegramData.user.ref_code
        } : null,
        headers_received: headers,
        timestamp: new Date().toISOString()
      });
    }, 'отладки Telegram middleware');
    } catch (error) {
      next(error);
    }
  }

  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      await this.handleRequest(req, res, async () => {
      const update = req.body;
      
      logger.info('[TelegramWebhook] Получено обновление от Telegram', {
        update_id: update.update_id,
        message: update.message ? {
          message_id: update.message.message_id,
          from: update.message.from,
          chat: update.message.chat,
          text: update.message.text
        } : null,
        callback_query: update.callback_query ? {
          id: update.callback_query.id,
          from: update.callback_query.from,
          data: update.callback_query.data
        } : null
      });

      // Обработка текстовых команд
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const userId = update.message.from.id;
        const username = update.message.from.username;
        const text = update.message.text.trim();
        
        // Проверяем, является ли пользователь администратором
        const isAdmin = await this.telegramService.checkAdminStatus(userId, username);
        
        if (text.startsWith('/start')) {
          await this.handleStartCommand(chatId, userId, username);
        } else if (text.startsWith('/admin') && isAdmin) {
          await this.handleAdminCommand(chatId, userId);
        } else if (text.startsWith('/stats') && isAdmin) {
          await this.handleStatsCommand(chatId, userId);
        } else if (text.startsWith('/users') && isAdmin) {
          await this.handleUsersCommand(chatId, userId, text);
        } else if (text.startsWith('/user ') && isAdmin) {
          const targetUserId = text.split(' ')[1];
          await this.handleUserCommand(chatId, userId, targetUserId);
        } else if (text.startsWith('/missions') && isAdmin) {
          await this.handleMissionsCommand(chatId, userId);
        } else if (text.startsWith('/ban ') && isAdmin) {
          const targetUserId = text.split(' ')[1];
          await this.handleBanCommand(chatId, userId, targetUserId);
        } else if (text.startsWith('/mission_complete ') && isAdmin) {
          const missionId = text.split(' ')[1];
          await this.handleMissionCompleteCommand(chatId, userId, missionId);
        } else if (text.startsWith('/mission_reward ') && isAdmin) {
          const missionId = text.split(' ')[1];
          await this.handleMissionRewardCommand(chatId, userId, missionId);
        } else if (isAdmin && (text.startsWith('/admin') || text.startsWith('/stats') || text.startsWith('/users') || text.startsWith('/missions') || text.startsWith('/ban') || text.startsWith('/mission_'))) {
          // Если команда админская, но не распознана
          await this.telegramService.sendMessage(chatId, 
            '❌ Неизвестная команда\n\n' +
            'Доступные команды:\n' +
            '/admin - Главное меню\n' +
            '/stats - Статистика\n' +
            '/users - Список пользователей\n' +
            '/user <id> - Информация о пользователе\n' +
            '/missions - Миссии\n' +
            '/mission_complete <id> - Выполнить миссию\n' +
            '/mission_reward <id> - Выдать награду\n' +
            '/ban <id> - Заблокировать пользователя'
          );
        } else if (!isAdmin && (text.startsWith('/admin') || text.startsWith('/stats') || text.startsWith('/users') || text.startsWith('/missions') || text.startsWith('/ban'))) {
          // Если пользователь не админ, но пытается использовать админ команды
          await this.telegramService.sendMessage(chatId, '❌ У вас нет прав администратора');
        }
      }

      // Обработка callback query (нажатия на кнопки)
      if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const userId = update.callback_query.from.id;
        const username = update.callback_query.from.username;
        const data = update.callback_query.data;
        
        const isAdmin = await this.telegramService.checkAdminStatus(userId, username);
        
        if (isAdmin && data) {
          await this.handleAdminCallback(chatId, userId, data);
        }
        
        await this.telegramService.answerCallbackQuery(update.callback_query.id);
      }

      this.sendSuccess(res, { 
        status: 'webhook_processed',
        update_id: update.update_id 
      });
    }, 'обработки Telegram webhook');
    } catch (error) {
      next(error);
    }
  }

  private async handleStartCommand(chatId: number, userId: number, username: string) {
    logger.info('[TelegramWebhook] Обработка команды /start', {
      chat_id: chatId,
      user_id: userId,
      username: username
    });

    await this.telegramService.sendMessage(chatId, 
      '🌾 Добро пожаловать в UniFarm Connect!\n\n' +
      'Начните фармить UNI и TON токены прямо сейчас!', 
      {
        reply_markup: {
          inline_keyboard: [[{
            text: '🚀 Запустить UniFarm',
            web_app: { url: 'https://uni-farm-connect-x-alinabndrnk99.replit.app' }
          }]]
        }
      }
    );
  }

  private async handleAdminCommand(chatId: number, userId: number) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Статистика', callback_data: 'admin_stats' }],
          [{ text: '👥 Пользователи', callback_data: 'admin_users' }],
          [{ text: '🎯 Миссии', callback_data: 'admin_missions' }],
          [{ text: '🔧 Управление', callback_data: 'admin_manage' }]
        ]
      }
    };

    await this.telegramService.sendMessage(chatId, 
      '🔧 Панель администратора UniFarm\n\n' +
      'Выберите раздел для управления:', 
      keyboard
    );
  }

  private async handleStatsCommand(chatId: number, userId: number) {
    try {
      const stats = await this.telegramService.getSystemStats();
      
      await this.telegramService.sendMessage(chatId, 
        `📊 Статистика системы UniFarm\n\n` +
        `👥 Пользователи: ${stats.totalUsers}\n` +
        `💰 Транзакции: ${stats.totalTransactions}\n` +
        `🌾 Фарминг-награды: ${stats.totalFarmingRewards}\n` +
        `⚡ Статус: ${stats.systemStatus}\n` +
        `🕐 Обновлено: ${new Date(stats.lastUpdated).toLocaleString('ru-RU')}`
      );
    } catch (error) {
      await this.telegramService.sendMessage(chatId, '❌ Ошибка получения статистики');
    }
  }

  private async handleUsersCommand(chatId: number, userId: number, text: string) {
    try {
      const page = parseInt(text.split(' ')[1]) || 1;
      const users = await this.telegramService.getUsersList(page, 10);
      
      let message = `👥 Пользователи (страница ${page}/${Math.ceil(users.total / 10)})\n\n`;
      
      users.users.forEach((user: any, index: number) => {
        message += `${(page - 1) * 10 + index + 1}. ${user.username || 'Неизвестно'}\n`;
        message += `   ID: ${user.telegram_id}\n`;
        message += `   UNI: ${user.balance_uni || '0'}\n`;
        message += `   TON: ${user.balance_ton || '0'}\n\n`;
      });
      
      const keyboard: any = { reply_markup: { inline_keyboard: [] } };
      
      if (page > 1) {
        keyboard.reply_markup.inline_keyboard.push([
          { text: '⬅️ Предыдущая', callback_data: `users_page_${page - 1}` }
        ]);
      }
      
      if (users.hasMore) {
        keyboard.reply_markup.inline_keyboard.push([
          { text: 'Следующая ➡️', callback_data: `users_page_${page + 1}` }
        ]);
      }
      
      await this.telegramService.sendMessage(chatId, message, keyboard);
    } catch (error) {
      await this.telegramService.sendMessage(chatId, '❌ Ошибка получения списка пользователей');
    }
  }

  private async handleUserCommand(chatId: number, userId: number, targetUserId: string) {
    try {
      const userInfo = await this.telegramService.getUserInfo(targetUserId);
      
      await this.telegramService.sendMessage(chatId, 
        `👤 Информация о пользователе\n\n` +
        `ID: ${userInfo.telegram_id}\n` +
        `Username: ${userInfo.username || 'Не указан'}\n` +
        `UNI баланс: ${userInfo.balance_uni || '0'}\n` +
        `TON баланс: ${userInfo.balance_ton || '0'}\n` +
        `Статус: ${userInfo.is_active ? 'Активен' : 'Неактивен'}\n` +
        `Регистрация: ${new Date(userInfo.created_at).toLocaleString('ru-RU')}`
      );
    } catch (error) {
      await this.telegramService.sendMessage(chatId, '❌ Пользователь не найден');
    }
  }

  private async handleMissionsCommand(chatId: number, userId: number) {
    try {
      const missionsData = await this.telegramService.getMissionsData();
      const { activeMissions, stats } = missionsData;
      
      let message = '🎯 Система миссий\n\n';
      message += '📊 Общая статистика:\n';
      message += `✅ Выполнено миссий: ${stats.totalCompletedMissions}\n`;
      message += `🎁 Получено наград: ${stats.totalRewardsClaimed}\n`;
      message += `💰 Общая сумма UNI: ${stats.totalRewardsUni}\n\n`;
      
      message += '🎯 Активные миссии:\n\n';
      
      activeMissions.forEach((mission: any, index: number) => {
        message += `${index + 1}. ${mission.title}\n`;
        message += `📝 ${mission.description}\n`;
        message += `💎 Награда: ${mission.reward_uni} UNI\n`;
        
        // Определяем тип миссии
        let missionType = 'Неизвестный';
        switch (mission.type) {
          case 'telegram_group':
            missionType = 'Telegram чат';
            break;
          case 'telegram_channel':
            missionType = 'Telegram канал';
            break;
          case 'youtube':
            missionType = 'YouTube подписка';
            break;
          case 'tiktok':
            missionType = 'TikTok подписка';
            break;
          default:
            missionType = 'Социальная сеть';
        }
        
        message += `📅 Тип: ${missionType}\n`;
        if (mission.url) {
          message += `🔗 Ссылка: ${mission.url}\n`;
        }
        message += `🟢 Статус: ${mission.status === 'ACTIVE' ? 'Активна' : 'Неактивна'}\n\n`;
      });
      
      message += '💡 Для управления миссиями используйте команды:\n';
      message += '/mission_complete <id> - отметить миссию как выполненную\n';
      message += '/mission_reward <id> - выдать награду за миссию';
      
      await this.telegramService.sendMessage(chatId, message);
    } catch (error) {
      logger.error('[TelegramController] Ошибка в handleMissionsCommand:', error);
      await this.telegramService.sendMessage(chatId, 
        '❌ Ошибка получения данных о миссиях. Попробуйте позже.'
      );
    }
  }

  private async handleBanCommand(chatId: number, userId: number, targetUserId: string) {
    try {
      const result = await this.telegramService.banUser(targetUserId);
      
      if (result) {
        await this.telegramService.sendMessage(chatId, 
          `✅ Пользователь ${targetUserId} заблокирован`
        );
      } else {
        await this.telegramService.sendMessage(chatId, 
          `❌ Ошибка блокировки пользователя ${targetUserId}`
        );
      }
    } catch (error) {
      await this.telegramService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  private async handleAdminCallback(chatId: number, userId: number, data: string) {
    if (data === 'admin_stats') {
      await this.handleStatsCommand(chatId, userId);
    } else if (data === 'admin_users') {
      await this.handleUsersCommand(chatId, userId, '/users 1');
    } else if (data === 'admin_missions') {
      await this.handleMissionsCommand(chatId, userId);
    } else if (data.startsWith('users_page_')) {
      const page = parseInt(data.split('_')[2]);
      await this.handleUsersCommand(chatId, userId, `/users ${page}`);
    }
  }

  private async handleMissionCompleteCommand(chatId: number, userId: number, missionId: string) {
    try {
      if (!missionId || isNaN(Number(missionId))) {
        await this.telegramService.sendMessage(chatId, '❌ Неверный ID миссии. Используйте: /mission_complete <id>');
        return;
      }

      const { MissionsService } = await import('../missions/service.ts');
      const missionsService = new MissionsService();
      
      // Для админской команды используем системный telegram_id
      const result = await missionsService.completeMission('admin', Number(missionId));
      
      if (result.success) {
        await this.telegramService.sendMessage(chatId, 
          `✅ ${result.message}\n` +
          `🎯 Миссия ${missionId} отмечена как выполненная`
        );
      } else {
        await this.telegramService.sendMessage(chatId, `❌ ${result.message}`);
      }
    } catch (error) {
      logger.error('[TelegramController] Ошибка в handleMissionCompleteCommand:', error);
      await this.telegramService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }

  private async handleMissionRewardCommand(chatId: number, userId: number, missionId: string) {
    try {
      if (!missionId || isNaN(Number(missionId))) {
        await this.telegramService.sendMessage(chatId, '❌ Неверный ID миссии. Используйте: /mission_reward <id>');
        return;
      }

      const { MissionsService } = await import('../missions/service.ts');
      const missionsService = new MissionsService();
      
      // Для админской команды используем системный telegram_id
      const result = await missionsService.claimMissionReward('admin', Number(missionId));
      
      if (result.success) {
        let message = `✅ ${result.message}\n`;
        message += `🎯 Награда за миссию ${missionId} выдана`;
        
        if (result.reward) {
          message += `\n💰 Получено: ${result.reward.uni} UNI`;
        }
        
        await this.telegramService.sendMessage(chatId, message);
      } else {
        await this.telegramService.sendMessage(chatId, `❌ ${result.message}`);
      }
    } catch (error) {
      logger.error('[TelegramController] Ошибка в handleMissionRewardCommand:', error);
      await this.telegramService.sendMessage(chatId, '❌ Ошибка выполнения команды');
    }
  }
}