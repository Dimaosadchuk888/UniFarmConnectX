import crypto from 'crypto';
import { telegramConfig } from '../../config/telegram';
import { logger } from '../../core/logger';

export class TelegramService {
  private botToken: string;

  constructor() {
    this.botToken = telegramConfig.botToken;
    if (!this.botToken) {
      logger.warn('[TelegramService] Bot token not configured');
    }
  }

  async initializeTelegramWebApp(): Promise<boolean> {
    try {
      logger.info('[TelegramService] Initializing Telegram WebApp');
      if (!this.botToken) {
        logger.warn('[TelegramService] No bot token available');
        return false;
      }
      return true;
    } catch (error) {
      logger.error('[TelegramService] Error initializing WebApp', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  async validateTelegramData(initData: string): Promise<boolean> {
    try {
      if (!this.botToken || !initData) {
        logger.warn('[TelegramService] Missing bot token or init data');
        return false;
      }

      logger.info('[TelegramService] Validating Telegram data');
      
      // Parse the init data
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      urlParams.delete('hash');
      
      if (!hash) {
        logger.warn('[TelegramService] No hash in init data');
        return false;
      }

      // Create data check string
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create secret key
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Calculate expected hash
      const expectedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      const isValid = expectedHash === hash;
      logger.info('[TelegramService] Validation result', { isValid });
      return isValid;
    } catch (error) {
      console.error('[TelegramService] Error validating Telegram data:', error);
      return false;
    }
  }

  async getUserFromTelegram(telegramId: string): Promise<any | null> {
    try {
      if (!this.botToken) {
        console.warn('[TelegramService] No bot token for user lookup');
        return null;
      }

      console.log('[TelegramService] Getting user from Telegram:', telegramId);
      
      // In a real implementation, this would make API calls to Telegram
      // For now, return basic user structure
      return {
        id: telegramId,
        is_bot: false,
        first_name: 'User',
        username: null,
        language_code: 'en'
      };
    } catch (error) {
      console.error('[TelegramService] Error getting user from Telegram:', error);
      return null;
    }
  }

  async sendTelegramNotification(userId: string, message: string): Promise<boolean> {
    try {
      if (!this.botToken) {
        console.warn('[TelegramService] No bot token for notifications');
        return false;
      }

      console.log('[TelegramService] Sending notification to user:', userId);
      
      const response = await fetch(`${telegramConfig.apiUrl}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: userId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error('[TelegramService] Error sending notification:', error);
      return false;
    }
  }

  async setupTelegramWebhook(url: string): Promise<boolean> {
    try {
      if (!this.botToken) {
        console.warn('[TelegramService] No bot token for webhook setup');
        return false;
      }

      console.log('[TelegramService] Setting up webhook:', url);
      
      const response = await fetch(`${telegramConfig.apiUrl}/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        })
      });

      const result = await response.json();
      console.log('[TelegramService] Webhook setup result:', result);
      return result.ok;
    } catch (error) {
      console.error('[TelegramService] Error setting up webhook:', error);
      return false;
    }
  }

  parseTelegramInitData(initData: string): any {
    try {
      const urlParams = new URLSearchParams(initData);
      const user = urlParams.get('user');
      
      if (user) {
        return JSON.parse(decodeURIComponent(user));
      }
      
      return null;
    } catch (error) {
      console.error('[TelegramService] Error parsing init data:', error);
      return null;
    }
  }
}