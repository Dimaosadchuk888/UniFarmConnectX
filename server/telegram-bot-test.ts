/**
 * Тестовий файл для перевірки роботи вебхука Telegram бота
 */

import express, { Request, Response } from 'express';

// Створюємо роутер Express
const router = express.Router();

// Обробляємо вебхуки від Telegram
router.post('/', (req: Request, res: Response) => {
  try {
    // Логуємо отримане повідомлення для відладки
    console.log('[Telegram Bot] Отримано повідомлення:', JSON.stringify(req.body, null, 2));
    
    // Відправляємо відповідь Telegram серверу
    res.status(200).send({ ok: true });
  } catch (error) {
    console.error('[Telegram Bot] Помилка при обробці вебхука:', error);
    res.status(500).send({ ok: false, error: 'Internal Server Error' });
  }
});

// Додаємо маршрут для перевірки стану бота
router.get('/status', (_req: Request, res: Response) => {
  res.status(200).send({
    ok: true,
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

/**
 * Налаштування вебхука для Telegram бота
 * @param token - Токен бота
 * @param webhookUrl - URL для вебхука
 */
export async function setupBotWebhook(token: string, webhookUrl: string): Promise<boolean> {
  try {
    console.log(`[Telegram Bot] Налаштовуємо вебхук на ${webhookUrl}`);
    
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    
    const data = await response.json();
    
    if (data && data.ok) {
      console.log('[Telegram Bot] ✅ Вебхук успішно налаштований');
      return true;
    } else {
      console.error('[Telegram Bot] ❌ Помилка при налаштуванні вебхука:', data?.description || 'Невідома помилка');
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] ❌ Помилка при налаштуванні вебхука:', error);
    return false;
  }
}

export default router;