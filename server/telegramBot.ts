/**
 * Базовый обработчик команд для Telegram-бота
 * Позволяет реализовать функции диагностики и отладки
 */

import fetch from 'node-fetch';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Проверяем наличие токена
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('🚫 Отсутствует токен бота TELEGRAM_BOT_TOKEN в переменных окружения');
}

// Типы для Telegram Update
interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Отправляет сообщение пользователю
 * @param chatId - ID чата/пользователя
 * @param text - Текст сообщения
 * @param options - Дополнительные опции сообщения
 */
async function sendMessage(chatId: number, text: string, options: Record<string, any> = {}): Promise<any> {
  if (!BOT_TOKEN) {
    console.error('Невозможно отправить сообщение: отсутствует токен бота');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options
      })
    });

    const data: any = await response.json();
    if (!data.ok) {
      console.error('Ошибка при отправке сообщения:', data.description);
    }
    return data;
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error);
  }
}

/**
 * Обрабатывает команду /ping
 * Отправляет ответное сообщение для проверки работоспособности бота
 */
async function handlePingCommand(chatId: number): Promise<any> {
  const responseTime = new Date().toISOString();
  return sendMessage(chatId, `🟢 Бот работает!\nВремя ответа: ${responseTime}`);
}

/**
 * Обрабатывает команду /info
 * Отправляет информацию о текущем пользователе
 */
async function handleInfoCommand(chatId: number, { userId, username, firstName }: { userId: number, username?: string, firstName?: string }): Promise<any> {
  const message = `
<b>📊 Информация о пользователе</b>

ID: <code>${userId}</code>
Имя: ${firstName || 'Не указано'}
Username: ${username ? `@${username}` : 'Не указан'}
Chat ID: <code>${chatId}</code>

Время запроса: ${new Date().toLocaleString()}
  `;
  return sendMessage(chatId, message);
}

/**
 * Обрабатывает команду /refcode
 * Получает и отображает реферальный код пользователя
 */
async function handleRefCodeCommand(chatId: number, userId: number): Promise<any> {
  // Здесь мы делаем запрос к нашей БД, чтобы получить ref_code
  try {
    // Пытаемся найти пользователя по Telegram ID
    const [user] = await db.select()
      .from(users)
      .where(eq(users.telegram_id, userId));

    if (user && user.ref_code) {
      return sendMessage(chatId, `
<b>🔗 Ваш реферальный код</b>

Код: <code>${user.ref_code}</code>
Ссылка: <code>https://t.me/UniFarmingBot/app?startapp=ref_${user.ref_code}</code>

Telegram ID: <code>${userId}</code>
User ID в системе: <code>${user.id}</code>
      `);
    } else {
      return sendMessage(chatId, `
⚠️ <b>Реферальный код не найден</b>

Возможные причины:
- Вы не зарегистрированы в системе
- Telegram ID (${userId}) не привязан к аккаунту
- Произошла ошибка при генерации кода

Попробуйте открыть Mini App и завершить регистрацию.
      `);
    }
  } catch (error: any) {
    console.error('Ошибка при получении ref_code:', error);
    return sendMessage(chatId, `❌ Ошибка при получении реферального кода: ${error.message}`);
  }
}

/**
 * Обрабатывает HTTP-запрос от webhook Telegram
 * @param update - Объект обновления от Telegram
 */
async function handleTelegramUpdate(update: TelegramUpdate): Promise<any> {
  console.log('Получено обновление от Telegram:', JSON.stringify(update));

  // Проверяем, что это сообщение с командой
  if (!update.message || !update.message.text) {
    return;
  }

  const { message } = update;
  const chatId = message.chat.id;
  const messageText = message.text;
  const userId = message.from.id;
  const username = message.from.username;
  const firstName = message.from.first_name;

  // Обрабатываем команды
  if (messageText === '/ping') {
    return handlePingCommand(chatId);
  } else if (messageText === '/info') {
    return handleInfoCommand(chatId, { userId, username, firstName });
  } else if (messageText === '/refcode') {
    return handleRefCodeCommand(chatId, userId);
  }
}

/**
 * Настраивает webhook для Telegram бота
 * @param webhookUrl - URL для вебхука (например, https://your-domain.com/api/telegram/webhook)
 * @returns Результат настройки вебхука
 */
async function setWebhook(webhookUrl: string): Promise<any> {
  if (!BOT_TOKEN) {
    console.error('Невозможно настроить вебхук: отсутствует токен бота');
    return { success: false, error: 'Отсутствует токен бота' };
  }

  console.log(`[Telegram Bot] Настройка вебхука на URL: ${webhookUrl}`);

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true, // Опционально: игнорировать накопившиеся обновления
        allowed_updates: ["message"] // Опционально: фильтр типов обновлений
      })
    });

    const data: any = await response.json();
    
    if (data.ok) {
      console.log('[Telegram Bot] Вебхук успешно настроен');
      return { success: true, data };
    } else {
      console.error('[Telegram Bot] Ошибка настройки вебхука:', data.description);
      return { success: false, error: data.description };
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Ошибка при настройке вебхука:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Удаляет настройки webhook для бота
 * @returns Результат удаления вебхука
 */
async function deleteWebhook(): Promise<any> {
  if (!BOT_TOKEN) {
    console.error('Невозможно удалить вебхук: отсутствует токен бота');
    return { success: false, error: 'Отсутствует токен бота' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drop_pending_updates: true // Опционально: игнорировать накопившиеся обновления
      })
    });

    const data: any = await response.json();
    
    if (data.ok) {
      console.log('[Telegram Bot] Вебхук успешно удален');
      return { success: true, data };
    } else {
      console.error('[Telegram Bot] Ошибка удаления вебхука:', data.description);
      return { success: false, error: data.description };
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Ошибка при удалении вебхука:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Получает информацию о текущем webhook
 * @returns Информация о вебхуке
 */
async function getWebhookInfo(): Promise<any> {
  if (!BOT_TOKEN) {
    console.error('Невозможно получить информацию о вебхуке: отсутствует токен бота');
    return { success: false, error: 'Отсутствует токен бота' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, {
      method: 'GET'
    });

    const data: any = await response.json();
    
    if (data.ok) {
      console.log('[Telegram Bot] Получена информация о вебхуке:', data.result);
      return { success: true, data: data.result };
    } else {
      console.error('[Telegram Bot] Ошибка получения информации о вебхуке:', data.description);
      return { success: false, error: data.description };
    }
  } catch (error: any) {
    console.error('[Telegram Bot] Ошибка при получении информации о вебхуке:', error);
    return { success: false, error: error.message };
  }
}

// Экспортируем функции для использования в routes.ts
export {
  sendMessage,
  handleTelegramUpdate,
  setWebhook,
  deleteWebhook,
  getWebhookInfo
};