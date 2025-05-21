/**
 * Тестовий файл для перевірки роботи вебхука Telegram бота
 */

import express, { Request, Response } from 'express';
import fetch from 'node-fetch';

// Створюємо роутер Express
const router = express.Router();

// Токен тестового бота 
const TEST_BOT_TOKEN = '7662298323:AAFLgX05fWtgNYJfT_VeZ_kRZhIBixoseIY';

/**
 * Відправляє тестове повідомлення від імені бота
 * @param chatId - ID чату
 * @param text - Текст повідомлення
 */
async function sendTestMessage(chatId: number, text: string): Promise<boolean> {
  try {
    console.log(`[Telegram Bot] Відправляємо повідомлення в чат ${chatId}: ${text}`);
    
    const response = await fetch(`https://api.telegram.org/bot${TEST_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    const data = await response.json();
    
    if (data && data.ok) {
      console.log('[Telegram Bot] ✅ Повідомлення успішно відправлено');
      return true;
    } else {
      console.error('[Telegram Bot] ❌ Помилка при відправці повідомлення:', data?.description || 'Невідома помилка');
      return false;
    }
  } catch (error) {
    console.error('[Telegram Bot] ❌ Помилка при відправці повідомлення:', error);
    return false;
  }
}

// Обробляємо вебхуки від Telegram
router.post('/', (req: Request, res: Response) => {
  try {
    // Логуємо отримане повідомлення для відладки
    console.log('[Telegram Bot] Отримано повідомлення:', JSON.stringify(req.body, null, 2));
    
    // Перевіряємо наявність повідомлення в запиті
    if (req.body && req.body.message) {
      const { message } = req.body;
      const chatId = message.chat?.id;
      const text = message.text;
      
      // Якщо отримали текст і ID чату, спробуємо відправити відповідь
      if (chatId && text) {
        console.log(`[Telegram Bot] Отримано повідомлення від ${message.from?.username || 'користувача'}: ${text}`);
        
        // Відправляємо ехо-відповідь на тестове повідомлення
        sendTestMessage(chatId, `Ви написали: ${text}`).catch(error => {
          console.error('[Telegram Bot] Помилка при відправці відповіді:', error);
        });
      }
    }
    
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

// Додаємо маршрут для тестової відправки повідомлення
router.get('/send-test', async (req: Request, res: Response) => {
  const chatId = req.query.chatId ? Number(req.query.chatId) : null;
  const text = req.query.text ? String(req.query.text) : 'Тестове повідомлення';
  
  if (!chatId) {
    return res.status(400).send({
      ok: false,
      error: 'Не вказано параметр chatId'
    });
  }
  
  try {
    const success = await sendTestMessage(chatId, text);
    
    if (success) {
      return res.status(200).send({
        ok: true,
        message: `Повідомлення успішно відправлено в чат ${chatId}`
      });
    } else {
      return res.status(500).send({
        ok: false,
        error: 'Не вдалося відправити повідомлення'
      });
    }
  } catch (error) {
    console.error('[Telegram Bot] Помилка при відправці тестового повідомлення:', error);
    return res.status(500).send({
      ok: false,
      error: 'Помилка при відправці повідомлення'
    });
  }
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