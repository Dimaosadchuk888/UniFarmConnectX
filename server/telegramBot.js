/**
 * Базовый обработчик команд для Telegram-бота
 * Позволяет реализовать функции диагностики и отладки
 */

import fetch from 'node-fetch';
import { db } from './db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Проверяем наличие токена
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('🚫 Отсутствует токен бота TELEGRAM_BOT_TOKEN в переменных окружения');
}

/**
 * Отправляет сообщение пользователю
 * @param {number} chatId - ID чата/пользователя
 * @param {string} text - Текст сообщения
 * @param {Object} options - Дополнительные опции сообщения
 */
async function sendMessage(chatId, text, options = {}) {
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

    const data = await response.json();
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
async function handlePingCommand(chatId) {
  const responseTime = new Date().toISOString();
  return sendMessage(chatId, `🟢 Бот работает!\nВремя ответа: ${responseTime}`);
}

/**
 * Обрабатывает команду /info
 * Отправляет информацию о текущем пользователе
 */
async function handleInfoCommand(chatId, { userId, username, firstName }) {
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
async function handleRefCodeCommand(chatId, userId) {
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
Ссылка: <code>https://t.me/UniFarming_Bot/app?startapp=ref_${user.ref_code}</code>

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
  } catch (error) {
    console.error('Ошибка при получении ref_code:', error);
    return sendMessage(chatId, `❌ Ошибка при получении реферального кода: ${error.message}`);
  }
}

/**
 * Обрабатывает команду /start
 * Отправляет приветственное сообщение с кнопкой запуска Mini App
 */
async function handleStartCommand(chatId, { userId, username, firstName }) {
  const MINI_APP_URL = 'https://t.me/UniFarming_Bot/UniFarm';
  
  const welcomeText = `Добро пожаловать в UniFarm!  
Запустить Mini App: ${MINI_APP_URL}`;

  return sendMessage(chatId, welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: MINI_APP_URL } }]
      ]
    },
    parse_mode: "Markdown"
  });
}

/**
 * Обрабатывает команду /app
 * Отправляет ссылку для открытия мини-приложения
 */
async function handleAppCommand(chatId) {
  const MINI_APP_URL = 'https://t.me/UniFarming_Bot/UniFarm';
  
  const appText = `Перейдите в Mini App: ${MINI_APP_URL}`;

  return sendMessage(chatId, appText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: MINI_APP_URL } }]
      ]
    }
  });
}

/**
 * Обрабатывает HTTP-запрос от webhook Telegram
 * @param {Object} update - Объект обновления от Telegram
 */
async function handleTelegramUpdate(update) {
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
  } else if (messageText === '/start') {
    return handleStartCommand(chatId, { userId, username, firstName });
  } else if (messageText === '/app') {
    return handleAppCommand(chatId);
  }
}

// Экспортируем функции для использования в routes.ts
export {
  sendMessage,
  handleTelegramUpdate,
  handleStartCommand,
  handleAppCommand,
  handlePingCommand,
  handleInfoCommand,
  handleRefCodeCommand
};