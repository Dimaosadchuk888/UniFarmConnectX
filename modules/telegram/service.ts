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
      
      for (const [key, value] of urlParams.entries()) {
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
      }

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
}

export const telegramService = new TelegramService();