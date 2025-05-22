/**
 * Модуль для перевірки налаштувань webhook Telegram бота
 */

import { Request, Response } from 'express';
import fetch from 'node-fetch';

// Інтерфейс для результату перевірки webhook
interface WebhookCheckResult {
  success: boolean;
  botInfo?: {
    username?: string;
    first_name?: string;
    id?: number;
  };
  webhookInfo?: {
    url?: string;
    has_custom_certificate?: boolean;
    pending_update_count?: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  webhookActions?: {
    current: string;
    expected: string;
    needsUpdate: boolean;
    updated?: boolean;
    message?: string;
    error?: string;
  };
  error?: string;
}

/**
 * Обробник для перевірки налаштувань webhook
 */
export async function checkWebhookHandler(req: Request, res: Response) {
  try {
    const result: WebhookCheckResult = {
      success: false
    };
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      result.error = 'TELEGRAM_BOT_TOKEN не встановлено в змінних середовища';
      return res.status(400).json(result);
    }
    
    // Отримуємо інформацію про бота
    try {
      const botInfo = await callTelegramApi(botToken, 'getMe');
      if (botInfo.ok) {
        result.botInfo = {
          username: botInfo.result.username,
          first_name: botInfo.result.first_name,
          id: botInfo.result.id
        };
      } else {
        result.error = `Помилка отримання інформації про бота: ${botInfo.description || 'Невідома помилка'}`;
        return res.status(400).json(result);
      }
    } catch (botError) {
      result.error = `Помилка виклику методу getMe: ${(botError as Error).message}`;
      return res.status(500).json(result);
    }
    
    // Отримуємо інформацію про webhook
    try {
      const webhookInfo = await callTelegramApi(botToken, 'getWebhookInfo');
      if (webhookInfo.ok) {
        result.webhookInfo = {
          url: webhookInfo.result.url,
          has_custom_certificate: webhookInfo.result.has_custom_certificate,
          pending_update_count: webhookInfo.result.pending_update_count,
          last_error_date: webhookInfo.result.last_error_date,
          last_error_message: webhookInfo.result.last_error_message
        };
      } else {
        result.error = `Помилка отримання інформації про webhook: ${webhookInfo.description || 'Невідома помилка'}`;
        return res.status(400).json(result);
      }
    } catch (webhookError) {
      result.error = `Помилка виклику методу getWebhookInfo: ${(webhookError as Error).message}`;
      return res.status(500).json(result);
    }
    
    // Перевіряємо URL для webhook
    const appUrl = process.env.APP_URL || process.env.MINI_APP_URL || 
      (process.env.REPLIT_SLUG ? `https://${process.env.REPLIT_SLUG}.${process.env.REPL_OWNER}.repl.co` : null);
    
    const expectedWebhook = process.env.TELEGRAM_WEBHOOK_URL || 
      (appUrl ? `${appUrl}/api/telegram/webhook` : null);
    
    // Якщо webhook не встановлено або встановлено неправильно, пропонуємо оновити
    if (!result.webhookInfo?.url || 
        (expectedWebhook && result.webhookInfo.url !== expectedWebhook)) {
      
      // Додаємо додаткову інформацію про різницю у URL
      const webhookActions = {
        current: result.webhookInfo?.url || 'не встановлено',
        expected: expectedWebhook || 'не визначено',
        needsUpdate: true
      };
      
      // Якщо переданий параметр update=true, оновлюємо webhook
      if (req.query.update === 'true' && expectedWebhook) {
        try {
          // Спочатку видаляємо поточний webhook
          await callTelegramApi(botToken, 'deleteWebhook', {
            drop_pending_updates: true
          });
          
          // Потім встановлюємо новий
          const setResult = await callTelegramApi(botToken, 'setWebhook', {
            url: expectedWebhook,
            drop_pending_updates: false,
            allowed_updates: ['message', 'callback_query']
          });
          
          if (setResult.ok) {
            webhookActions.updated = true;
            webhookActions.message = `Webhook успішно оновлено на ${expectedWebhook}`;
            
            // Оновлюємо інформацію про webhook
            const newWebhookInfo = await callTelegramApi(botToken, 'getWebhookInfo');
            if (newWebhookInfo.ok) {
              result.webhookInfo = {
                url: newWebhookInfo.result.url,
                has_custom_certificate: newWebhookInfo.result.has_custom_certificate,
                pending_update_count: newWebhookInfo.result.pending_update_count,
                last_error_date: newWebhookInfo.result.last_error_date,
                last_error_message: newWebhookInfo.result.last_error_message
              };
            }
          } else {
            webhookActions.updated = false;
            webhookActions.error = setResult.description || 'Не вдалося оновити webhook';
          }
        } catch (updateError) {
          webhookActions.updated = false;
          webhookActions.error = (updateError as Error).message;
        }
      }
      
      result.webhookActions = webhookActions;
    }
    
    result.success = true;
    return res.json(result);
    
  } catch (error) {
    console.error('[Webhook Check] Помилка:', error);
    return res.status(500).json({
      success: false,
      error: `Внутрішня помилка сервера: ${(error as Error).message}`
    });
  }
}

/**
 * Інтерфейс для відповіді Telegram API
 */
interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Функція для виклику Telegram API
 */
async function callTelegramApi(botToken: string, method: string, params: any = {}): Promise<TelegramResponse> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP помилка ${response.status}: ${errorText}`);
  }
  
  return await response.json() as TelegramResponse;
}

export default checkWebhookHandler;