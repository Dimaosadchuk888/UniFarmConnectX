import { logger } from '../../core/logger';
import { supabase } from '../../core/supabase';
import { telegramConfig } from '../../config/telegram';

export interface WebAppData {
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_bot?: boolean;
    is_premium?: boolean;
  };
  query_id?: string;
  auth_date: number;
  hash: string;
  chat_instance?: string;
  chat_type?: string;
  start_param?: string;
}

export interface TelegramCommand {
  command: string;
  description: string;
}

export class TelegramService {
  private botToken: string;

  constructor() {
    this.botToken = telegramConfig.botToken;
  }

  /**
   * Получить данные Telegram WebApp
   */
  async getWebAppData(initData: string): Promise<{
    success: boolean;
    data?: WebAppData;
    error?: string;
  }> {
    try {
      logger.info('[TelegramService] Парсинг WebApp данных');
      
      // Парсим initData строку
      const urlParams = new URLSearchParams(initData);
      const params: any = {};
      
      urlParams.forEach((value, key) => {
        if (key === 'user') {
          try {
            params.user = JSON.parse(decodeURIComponent(value));
          } catch (e) {
            logger.error('[TelegramService] Ошибка парсинга user данных', e);
            return {
              success: false,
              error: 'Неверный формат user данных'
            };
          }
        } else {
          params[key] = decodeURIComponent(value);
        }
      });

      // Проверяем обязательные поля
      if (!params.user || !params.auth_date || !params.hash) {
        return {
          success: false,
          error: 'Отсутствуют обязательные поля WebApp данных'
        };
      }

      const webAppData: WebAppData = {
        user: params.user,
        query_id: params.query_id,
        auth_date: parseInt(params.auth_date),
        hash: params.hash,
        chat_instance: params.chat_instance,
        chat_type: params.chat_type,
        start_param: params.start_param
      };

      logger.info('[TelegramService] WebApp данные успешно получены', {
        userId: webAppData.user.id,
        username: webAppData.user.username
      });

      return {
        success: true,
        data: webAppData
      };
    } catch (error) {
      logger.error('[TelegramService] Ошибка получения WebApp данных', error);
      return {
        success: false,
        error: 'Внутренняя ошибка сервера'
      };
    }
  }

  /**
   * Установить команды бота в Telegram
   */
  async setCommands(commands: TelegramCommand[]): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      logger.info('[TelegramService] Установка команд бота', { commandsCount: commands.length });

      if (!this.botToken) {
        return {
          success: false,
          message: 'Bot token не настроен',
          error: 'BOT_TOKEN_MISSING'
        };
      }

      // Формируем запрос к Telegram Bot API
      const url = `https://api.telegram.org/bot${this.botToken}/setMyCommands`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commands: commands
        })
      });

      const result = await response.json();

      if (result.ok) {
        logger.info('[TelegramService] Команды бота успешно установлены');
        return {
          success: true,
          message: 'Команды успешно установлены'
        };
      } else {
        logger.error('[TelegramService] Ошибка установки команд', result);
        return {
          success: false,
          message: 'Ошибка установки команд',
          error: result.description || 'TELEGRAM_API_ERROR'
        };
      }
    } catch (error) {
      logger.error('[TelegramService] Ошибка установки команд бота', error);
      return {
        success: false,
        message: 'Внутренняя ошибка сервера',
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Отправить сообщение пользователю через бота
   */
  async sendMessage(chatId: number, text: string, options?: any): Promise<{
    success: boolean;
    messageId?: number;
    error?: string;
  }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          ...options
        })
      });

      const result = await response.json();

      if (result.ok) {
        return {
          success: true,
          messageId: result.result.message_id
        };
      } else {
        logger.error('[TelegramService] Ошибка отправки сообщения', result);
        return {
          success: false,
          error: result.description || 'TELEGRAM_API_ERROR'
        };
      }
    } catch (error) {
      logger.error('[TelegramService] Ошибка отправки сообщения', error);
      return {
        success: false,
        error: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<any> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getWebhookInfo`;
      const response = await fetch(url);
      const result = await response.json();
      return result;
    } catch (error) {
      logger.error('[TelegramService] Ошибка получения webhook info', error);
      return { ok: false, error };
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
      const response = await fetch(url, { method: 'POST' });
      const result = await response.json();
      
      if (result.ok) {
        return { success: true, message: 'Webhook удален' };
      } else {
        return { success: false, message: result.description || 'Ошибка удаления webhook' };
      }
    } catch (error) {
      logger.error('[TelegramService] Ошибка удаления webhook', error);
      return { success: false, message: 'Внутренняя ошибка сервера' };
    }
  }

  /**
   * Set webhook for the main bot
   */
  async setWebhook(webhookUrl: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/setWebhook`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        })
      });

      const result = await response.json();

      if (result.ok) {
        logger.info('[TelegramService] Webhook успешно установлен', { webhookUrl });
        return {
          success: true,
          message: 'Webhook установлен'
        };
      } else {
        logger.error('[TelegramService] Ошибка установки webhook', result);
        return {
          success: false,
          message: result.description || 'Ошибка установки webhook'
        };
      }
    } catch (error) {
      logger.error('[TelegramService] Ошибка установки webhook', error);
      return {
        success: false,
        message: 'Внутренняя ошибка сервера'
      };
    }
  }

  /**
   * Process webhook update from Telegram
   */
  async processUpdate(update: any): Promise<void> {
    try {
      logger.info('[TelegramService] Получено обновление от Telegram', {
        updateId: update.update_id,
        messageText: update.message?.text,
        fromUsername: update.message?.from?.username,
        fromId: update.message?.from?.id,
        chatId: update.message?.chat?.id,
        hasMessage: !!update.message,
        hasCallbackQuery: !!update.callback_query
      });

      // Handle /start command
      if (update.message && update.message.text === '/start') {
        logger.info('[TelegramService] Обрабатываем команду /start');
        await this.handleStartCommand(update.message);
        logger.info('[TelegramService] Команда /start обработана успешно');
        return;
      }

      // Ignore all other messages/commands
      logger.info('[TelegramService] Игнорируем сообщение (не /start)', {
        text: update.message?.text,
        from: update.message?.from?.username
      });
    } catch (error) {
      logger.error('[TelegramService] КРИТИЧЕСКАЯ ОШИБКА обработки обновления', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        updateId: update.update_id,
        messageText: update.message?.text,
        fromUsername: update.message?.from?.username
      });
    }
  }

  /**
   * Handle /start command - show welcome message with WebApp button
   */
  private async handleStartCommand(message: any): Promise<void> {
    try {
      const chatId = message.chat.id;
      const username = message.from?.username || 'пользователь';

      logger.info('[TelegramService] Обработка команды /start', {
        chatId,
        username,
        userId: message.from?.id
      });

      // Welcome message text
      const welcomeText = `🎉 Добро пожаловать в UniFarm —  
приложение, в котором токены работают на тебя!

🚜 Здесь ты не просто хранишь UNI и TON — ты запускаешь их в работу.  
Каждая минута приносит доход — всё зависит от твоего выбора и стратегии.

🎯 Выбери стратегию. Активируй фарминг. Следи за ростом.

👇 Готов начать? Жми кнопку ниже и заходи в своё поле токенов!`;

      // Create inline keyboard with WebApp button
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🚀 Запустить UniFarm',
              web_app: {
                url: `https://t.me/${telegramConfig.botUsername}/${telegramConfig.webAppName}`
              }
            }
          ]
        ]
      };

      // Send welcome message
      logger.info('[TelegramService] Отправляем приветственное сообщение', {
        chatId,
        username,
        webAppUrl: `https://t.me/${telegramConfig.botUsername}/${telegramConfig.webAppName}`
      });

      const sendResult = await this.sendMessage(chatId, welcomeText, {
        reply_markup: keyboard
      });

      if (sendResult.success) {
        logger.info('[TelegramService] Приветственное сообщение отправлено УСПЕШНО', {
          chatId,
          username,
          messageId: sendResult.messageId
        });
      } else {
        logger.error('[TelegramService] ОШИБКА отправки приветственного сообщения', {
          chatId,
          username,
          error: sendResult.error
        });
      }

    } catch (error) {
      logger.error('[TelegramService] Ошибка обработки /start команды', error);
    }
  }
}

export const telegramService = new TelegramService();