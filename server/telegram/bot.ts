import fetch from 'node-fetch';
import logger from '../utils/logger';

interface TelegramApiResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Базовый класс для работы с Telegram Bot API
 */
export class TelegramBot {
  private token: string;
  private baseUrl: string;
  private botUsername: string | null = null;

  constructor() {
    // Получаем токен из переменных окружения
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    }
    
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
  }

  /**
   * Инициализирует бота и получает информацию о нем
   */
  async initialize(): Promise<boolean> {
    try {
      const botInfo = await this.getMe();
      
      if (botInfo && botInfo.ok && botInfo.result) {
        this.botUsername = botInfo.result.username;
        logger.info(`[TelegramBot] Бот успешно инициализирован: @${this.botUsername}`);
        
        // Сохраняем имя пользователя бота в переменных окружения
        process.env.TELEGRAM_BOT_USERNAME = this.botUsername;
        
        return true;
      } else {
        logger.error(`[TelegramBot] Ошибка инициализации бота: ${botInfo?.description || 'Неизвестная ошибка'}`);
        return false;
      }
    } catch (error) {
      logger.error('[TelegramBot] Ошибка при инициализации бота:', error);
      return false;
    }
  }

  /**
   * Получает информацию о боте
   */
  async getMe(): Promise<TelegramApiResponse> {
    return await this.callApi('getMe');
  }

  /**
   * Устанавливает команды бота
   */
  async setCommands(commands: { command: string; description: string }[]): Promise<TelegramApiResponse> {
    return await this.callApi('setMyCommands', {
      commands: JSON.stringify(commands)
    });
  }

  /**
   * Устанавливает вебхук для получения обновлений
   */
  async setWebhook(url: string): Promise<TelegramApiResponse> {
    return await this.callApi('setWebhook', {
      url,
      allowed_updates: JSON.stringify(['message', 'callback_query'])
    });
  }

  /**
   * Отправляет сообщение в чат
   */
  async sendMessage(chatId: number | string, text: string, options: any = {}): Promise<TelegramApiResponse> {
    return await this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      ...options
    });
  }

  /**
   * Устанавливает URL для мини-приложения
   */
  async setMenuButton(menuButton: any): Promise<TelegramApiResponse> {
    return await this.callApi('setMenuButton', menuButton);
  }

  /**
   * Устанавливает все настройки бота для работы с Mini App
   */
  async setupMiniApp(appUrl: string): Promise<boolean> {
    try {
      logger.info('[TelegramBot] Начинаем настройку Mini App...');
      
      // Проверка работоспособности бота
      const botInfo = await this.getMe();
      if (!botInfo.ok) {
        logger.error('[TelegramBot] Невозможно получить информацию о боте');
        return false;
      }
      
      // Устанавливаем команды бота
      const commands = [
        { command: 'start', description: 'Начать использовать UniFarm' },
        { command: 'help', description: 'Помощь по использованию' },
        { command: 'deposit', description: 'Внести депозит' },
        { command: 'withdraw', description: 'Вывести средства' },
        { command: 'referral', description: 'Реферальная программа' }
      ];
      
      const commandsResult = await this.setCommands(commands);
      if (!commandsResult.ok) {
        logger.error(`[TelegramBot] Ошибка при установке команд: ${commandsResult.description}`);
      } else {
        logger.info('[TelegramBot] Команды успешно установлены');
      }
      
      // Устанавливаем кнопку меню с Mini App
      const menuButton = {
        menu_button: {
          type: 'web_app',
          text: 'Открыть UniFarm',
          web_app: { url: appUrl }
        }
      };
      
      const menuResult = await this.setMenuButton(menuButton);
      if (!menuResult.ok) {
        logger.error(`[TelegramBot] Ошибка при установке кнопки меню: ${menuResult.description}`);
      } else {
        logger.info('[TelegramBot] Кнопка меню успешно установлена');
      }
      
      // Если есть URL для вебхука, устанавливаем его
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
      if (webhookUrl) {
        const webhookResult = await this.setWebhook(`${webhookUrl}/api/telegram/webhook`);
        if (!webhookResult.ok) {
          logger.error(`[TelegramBot] Ошибка при установке вебхука: ${webhookResult.description}`);
        } else {
          logger.info(`[TelegramBot] Вебхук успешно установлен: ${webhookUrl}/api/telegram/webhook`);
        }
      } else {
        logger.warn('[TelegramBot] TELEGRAM_WEBHOOK_URL не указан, вебхук не установлен');
      }
      
      logger.info('[TelegramBot] Настройка Mini App завершена успешно');
      return true;
    } catch (error) {
      logger.error('[TelegramBot] Ошибка при настройке Mini App:', error);
      return false;
    }
  }

  /**
   * Выполняет запрос к Telegram API
   */
  private async callApi(method: string, params: any = {}): Promise<TelegramApiResponse> {
    try {
      const url = `${this.baseUrl}/${method}`;
      
      // Подготавливаем параметры для запроса
      const requestParams = new URLSearchParams();
      for (const key in params) {
        requestParams.append(key, params[key]);
      }
      
      // Выполняем запрос
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestParams
      });
      
      // Обрабатываем ответ
      const data = await response.json() as TelegramApiResponse;
      
      if (!data.ok) {
        logger.error(`[TelegramBot] Ошибка API (${method}): ${data.description}, код: ${data.error_code}`);
      }
      
      return data;
    } catch (error) {
      logger.error(`[TelegramBot] Ошибка при вызове API (${method}):`, error);
      return { ok: false, description: error instanceof Error ? error.message : String(error) };
    }
  }
}

// Создаем экземпляр бота для использования в приложении
export const telegramBot = new TelegramBot();