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
  const startTime = Date.now();
  const responseTime = new Date().toISOString();
  
  // Получаем webhookInfo для проверки статуса соединения
  const webhookStatus = await getWebhookInfo();
  const webhookUrl = webhookStatus?.data?.url || 'Не настроен';
  const processingTime = Date.now() - startTime;
  
  const message = `
<b>🟢 Pong! Бот работает</b>

⏱ Время ответа: ${processingTime}ms
⏰ Дата/время: ${responseTime}
🔌 Webhook: ${webhookUrl}

<i>Если вы видите это сообщение, значит бот успешно получает и обрабатывает команды.</i>
  `;
  
  return sendMessage(chatId, message);
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
 * Обрабатывает команду /start
 * Приветствует пользователя и отображает клавиатуру с командами
 */
async function handleStartCommand(chatId: number, { userId, username, firstName }: { userId: number, username?: string, firstName?: string }): Promise<any> {
  const welcomeMessage = `
👋 <b>Привет${firstName ? ', ' + firstName : ''}!</b>

Я бот <b>UniFarm</b> - твой помощник в криптофарминге.

Ты можешь воспользоваться следующими командами:
• /ping - проверить связь с ботом
• /info - получить информацию о себе
• /refcode - получить реферальный код

🚀 Для полного доступа к функциональности запусти <a href="https://t.me/UniFarmingBot/app">Mini App</a>
  `;

  // Создаем клавиатуру с основными командами
  const replyMarkup = {
    keyboard: [
      [{ text: "🔄 Проверить связь (/ping)" }],
      [{ text: "ℹ️ Моя информация (/info)" }],
      [{ text: "🔗 Мой реф. код (/refcode)" }],
      [{ text: "📱 Открыть UniFarm", web_app: { url: "https://t.me/UniFarmingBot/app" } }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  return sendMessage(chatId, welcomeMessage, { 
    parse_mode: 'HTML',
    reply_markup: JSON.stringify(replyMarkup),
    disable_web_page_preview: true
  });
}

/**
 * Обрабатывает HTTP-запрос от webhook Telegram
 * @param update - Объект обновления от Telegram
 */
async function handleTelegramUpdate(update: TelegramUpdate): Promise<any> {
  // Проверка на валидные данные
  if (!update) {
    console.error('[Telegram Bot] Получено пустое или невалидное обновление');
    return;
  }

  // Обработка различных типов обновлений
  if (update.message) {
    return handleMessageUpdate(update);
  } else {
    console.log('[Telegram Bot] Получен неподдерживаемый тип обновления:', 
      Object.keys(update).filter(key => key !== 'update_id').join(', '));
    return;
  }
}

/**
 * Обрабатывает обновление с сообщением
 * @param update - Объект обновления от Telegram, содержащий сообщение
 */
async function handleMessageUpdate(update: TelegramUpdate): Promise<any> {
  const { message } = update;
  
  if (!message) {
    console.error('[Telegram Bot] Сообщение отсутствует в обновлении');
    return;
  }
  
  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username;
  const firstName = message.from.first_name;
  
  // Формируем информацию о пользователе для логов
  const userInfo = username ? `@${username} (ID: ${userId})` : `User ID: ${userId}`;
  
  // Проверяем наличие текста сообщения
  if (!message.text) {
    console.log(`[Telegram Bot] Получено сообщение без текста от ${userInfo}`);
    return sendMessage(chatId, 'Я могу обрабатывать только текстовые сообщения. Используйте /start, чтобы увидеть доступные команды.');
  }
  
  const messageText = message.text.trim();
  
  // Красивый лог в консоль
  console.log(`\n[Telegram Bot] [${new Date().toISOString()}] Сообщение от ${userInfo}:`);
  console.log(`   Текст: "${messageText}"`);
  console.log(`   Чат: ${message.chat.type} (ID: ${chatId})`);
  
  // Обрабатываем команды
  if (messageText === '/start') {
    console.log(`[Telegram Bot] Обработка команды /start`);
    return handleStartCommand(chatId, { userId, username, firstName });
  } else if (messageText === '/ping' || messageText === '🔄 Проверить связь (/ping)') {
    console.log(`[Telegram Bot] Обработка команды /ping`);
    return handlePingCommand(chatId);
  } else if (messageText === '/info' || messageText === 'ℹ️ Моя информация (/info)') {
    console.log(`[Telegram Bot] Обработка команды /info`);
    return handleInfoCommand(chatId, { userId, username, firstName });
  } else if (messageText === '/refcode' || messageText === '🔗 Мой реф. код (/refcode)') {
    console.log(`[Telegram Bot] Обработка команды /refcode`);
    return handleRefCodeCommand(chatId, userId);
  } else {
    // Для сообщений, которые не являются известными командами
    console.log(`[Telegram Bot] Получена неизвестная команда: ${messageText}`);
    
    // Проверяем, может это частичное совпадение с известными командами
    if (messageText.startsWith('/start')) {
      return handleStartCommand(chatId, { userId, username, firstName });
    } else if (messageText.includes('ping') || messageText.includes('пинг')) {
      return handlePingCommand(chatId);
    } else if (messageText.includes('info') || messageText.includes('инфо')) {
      return handleInfoCommand(chatId, { userId, username, firstName });
    } else if (messageText.includes('ref') || messageText.includes('код') || messageText.includes('реф')) {
      return handleRefCodeCommand(chatId, userId);
    }
    
    // Если ничего не подошло, отправляем подсказку
    return sendMessage(chatId, `Я не понимаю эту команду. Попробуйте /start для отображения доступных действий.`);
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

/**
 * Отправляет уведомление о состоянии приложения в указанный чат
 * @param chatId - ID чата для отправки уведомления
 * @param status - Статус приложения ("started", "deployed", "updated", "error")
 * @param details - Дополнительная информация о статусе
 */
async function sendAppStatusNotification(
  chatId: number, 
  status: "started" | "deployed" | "updated" | "error",
  details?: string
): Promise<any> {
  let emoji: string;
  let title: string;
  
  switch (status) {
    case "started":
      emoji = "🚀";
      title = "Приложение запущено";
      break;
    case "deployed":
      emoji = "✅";
      title = "Приложение успешно развёрнуто";
      break;
    case "updated":
      emoji = "🔄";
      title = "Приложение обновлено";
      break;
    case "error":
      emoji = "❌";
      title = "Ошибка в приложении";
      break;
  }
  
  const message = `
${emoji} <b>${title}</b>

⏱ Дата/время: ${new Date().toISOString()}
🌐 URL: ${process.env.APP_URL || "Не указан"}

${details ? `<i>${details}</i>` : ""}
`;

  return sendMessage(chatId, message);
}

// Экспортируем функции для использования в routes.ts
export {
  sendMessage,
  handleTelegramUpdate,
  handleMessageUpdate,
  setWebhook,
  deleteWebhook,
  getWebhookInfo,
  sendAppStatusNotification
};