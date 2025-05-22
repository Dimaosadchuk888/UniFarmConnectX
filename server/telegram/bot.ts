/**
 * Модуль для ініціалізації та керування Telegram ботом
 * 
 * Цей модуль відповідає за налаштування та роботу з Telegram ботом,
 * включаючи webhook, обробку повідомлень та інтеграцію з Mini App.
 */

import { Express, Request, Response } from 'express';
import { setupWebhook, getWebhookInfo, setMenuButton } from './setup-hook';

// Налаштування для бота
const BOT_MENU_TEXT = 'Открыть UniFarm';

/**
 * Ініціалізує бота та налаштовує необхідні компоненти
 */
export async function initializeBot(): Promise<boolean> {
  try {
    console.log('[Telegram Bot] Початок ініціалізації бота');
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.error('[Telegram Bot] TELEGRAM_BOT_TOKEN не встановлено в змінних середовища');
      return false;
    }
    
    // Отримуємо URL для Mini App
    const miniAppUrl = process.env.MINI_APP_URL || process.env.APP_URL;
    
    if (!miniAppUrl) {
      console.error('[Telegram Bot] MINI_APP_URL або APP_URL не встановлено в змінних середовища');
      return false;
    }
    
    // Налаштовуємо кнопку меню для бота
    try {
      const menuResult = await setMenuButton(BOT_MENU_TEXT, miniAppUrl);
      
      if (!menuResult.success) {
        console.warn(`[Telegram Bot] Попередження при налаштуванні кнопки меню: ${menuResult.error}`);
      } else {
        console.log('[Telegram Bot] Кнопка меню успішно налаштована');
      }
    } catch (menuError) {
      console.error('[Telegram Bot] Помилка при налаштуванні кнопки меню:', menuError);
    }
    
    // Отримуємо URL для webhook
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('[Telegram Bot] TELEGRAM_WEBHOOK_URL не встановлено, webhook не буде налаштовано');
    } else {
      // Налаштовуємо webhook
      try {
        const webhookResult = await setupWebhook(webhookUrl);
        
        if (!webhookResult.success) {
          console.warn(`[Telegram Bot] Попередження при налаштуванні webhook: ${webhookResult.error}`);
        } else {
          console.log('[Telegram Bot] Webhook успішно налаштовано');
        }
      } catch (webhookError) {
        console.error('[Telegram Bot] Помилка при налаштуванні webhook:', webhookError);
      }
    }
    
    console.log('[Telegram Bot] Ініціалізація бота завершена успішно');
    return true;
  } catch (error) {
    console.error('[Telegram Bot] Помилка при ініціалізації бота:', error);
    return false;
  }
}

/**
 * Налаштовує маршрути для обробки повідомлень від Telegram
 */
export function setupBotRoutes(app: Express): void {
  // Маршрут для webhook
  app.post('/api/telegram/webhook', handleWebhook);
  
  // Маршрут для перевірки стану бота
  app.get('/api/telegram/status', handleBotStatus);
  
  // Маршрут для перевірки та оновлення webhook
  import('../check-webhook').then(module => {
    app.get('/api/telegram/check-webhook', module.checkWebhookHandler);
    console.log('[Telegram Bot] Додано маршрут для перевірки webhook');
  }).catch(error => {
    console.error('[Telegram Bot] Помилка імпорту модуля check-webhook:', error);
  });
  
  console.log('[Telegram Bot] Маршрути для бота налаштовано');
}

/**
 * Обробляє повідомлення від Telegram, які надходять через webhook
 */
async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const update = req.body;
    
    console.log('[Telegram Bot] Отримано оновлення від Telegram:', JSON.stringify(update));
    
    // Тут буде обробка повідомлень від Telegram
    // ...
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('[Telegram Bot] Помилка при обробці webhook:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Повертає інформацію про стан бота
 */
async function handleBotStatus(req: Request, res: Response): Promise<void> {
  try {
    // Отримуємо інформацію про webhook
    const webhookInfo = await getWebhookInfo();
    
    res.json({
      success: true,
      data: {
        hasToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        miniAppUrl: process.env.MINI_APP_URL || process.env.APP_URL,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
        webhookInfo: webhookInfo.success ? webhookInfo.info : null,
        webhookError: webhookInfo.error,
        menuText: BOT_MENU_TEXT
      }
    });
  } catch (error) {
    console.error('[Telegram Bot] Помилка при отриманні статусу бота:', error);
    
    res.status(500).json({
      success: false,
      error: 'Помилка при отриманні статусу бота'
    });
  }
}