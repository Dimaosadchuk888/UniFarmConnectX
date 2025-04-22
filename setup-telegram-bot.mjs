/**
 * Скрипт для настройки Telegram бота
 * - Устанавливает webhook
 * - Добавляет меню команд
 * - Настраивает кнопки приветствия
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

// Базовый URL для API Telegram
const API_BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Асинхронная функция для вызова методов Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${method}:`, error.message);
    throw error;
  }
}

// Получает текущую информацию о webhook
async function getWebhookInfo() {
  try {
    const result = await callTelegramApi('getWebhookInfo');
    return result.result;
  } catch (error) {
    console.error('❌ Не удалось получить информацию о webhook:', error.message);
    throw error;
  }
}

// Устанавливает webhook для бота
async function setWebhook(url) {
  try {
    // Дополнительные параметры для webhook
    const params = {
      url,
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'], // Разрешаем обрабатывать сообщения и callback_query
    };
    
    console.log(`🔄 Настройка webhook на: ${url}`);
    const result = await callTelegramApi('setWebhook', params);
    
    console.log('✅ Webhook успешно установлен');
    return result;
  } catch (error) {
    console.error('❌ Ошибка установки webhook:', error.message);
    throw error;
  }
}

// Удаляет webhook для бота
async function deleteWebhook() {
  try {
    console.log('🔄 Удаление текущего webhook...');
    const result = await callTelegramApi('deleteWebhook', { drop_pending_updates: true });
    
    console.log('✅ Webhook успешно удален');
    return result;
  } catch (error) {
    console.error('❌ Ошибка удаления webhook:', error.message);
    throw error;
  }
}

// Устанавливает команды для бота
async function setMyCommands() {
  try {
    // Определяем список команд для меню
    const commands = [
      { command: 'start', description: 'Запуск бота и приветствие' },
      { command: 'ping', description: 'Проверить работу бота' },
      { command: 'info', description: 'Показать мою информацию' },
      { command: 'refcode', description: 'Получить мой реферальный код' },
      { command: 'app', description: 'Открыть приложение UniFarm' }
    ];
    
    console.log('🔄 Установка команд для бота...');
    const result = await callTelegramApi('setMyCommands', { commands });
    
    console.log('✅ Команды успешно установлены');
    return result;
  } catch (error) {
    console.error('❌ Ошибка установки команд:', error.message);
    throw error;
  }
}

// Получает информацию о боте
async function getMe() {
  try {
    console.log('🔄 Получение информации о боте...');
    const result = await callTelegramApi('getMe');
    
    console.log(`✅ Информация о боте получена: @${result.result.username}`);
    return result.result;
  } catch (error) {
    console.error('❌ Ошибка получения информации о боте:', error.message);
    throw error;
  }
}

// Основная функция
async function main() {
  try {
    console.log('🚀 Запуск настройки Telegram бота...');
    
    // Получаем информацию о боте
    const botInfo = await getMe();
    console.log(`
    ====================================
    🤖 Бот: ${botInfo.first_name} (@${botInfo.username})
    ID: ${botInfo.id}
    ====================================
    `);
    
    // Получаем текущие настройки webhook
    const webhookInfo = await getWebhookInfo();
    console.log(`
    Текущие настройки webhook:
    URL: ${webhookInfo.url || 'не установлен'}
    Pending updates: ${webhookInfo.pending_update_count}
    `);
    
    // Запрашиваем URL для webhook (в production берется из env)
    let webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
      // Получаем URL из аргументов командной строки
      const args = process.argv.slice(2);
      webhookUrl = args[0];
      
      if (!webhookUrl) {
        throw new Error('URL для webhook не указан. Используйте: node setup-telegram-bot.mjs https://your-domain.com/api/telegram/webhook');
      }
    }
    
    // Сначала удаляем текущий webhook
    await deleteWebhook();
    
    // Устанавливаем новый webhook
    await setWebhook(webhookUrl);
    
    // Устанавливаем команды для бота
    await setMyCommands();
    
    // Проверяем настройки
    const newWebhookInfo = await getWebhookInfo();
    console.log(`
    ====================================
    ✅ Настройка успешно завершена!
    
    Новые настройки webhook:
    URL: ${newWebhookInfo.url}
    
    Дополнительные действия:
    1. Проверьте работу бота: отправьте /start в @${botInfo.username}
    2. Убедитесь, что сервер доступен по URL: ${webhookUrl}
    ====================================
    `);
    
  } catch (error) {
    console.error('❌ Ошибка при настройке бота:', error.message);
    process.exit(1);
  }
}

// Запускаем основную функцию
main();