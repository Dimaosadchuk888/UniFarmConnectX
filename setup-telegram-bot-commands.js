/**
 * Скрипт для настройки кнопок и команд Telegram бота согласно ТЗ
 * 
 * Этот скрипт настраивает:
 * 1. Menu Button (кнопка в профиле бота)
 * 2. Кнопку в приветственном сообщении
 * 3. Команду /app
 * 4. Команду /start
 * 5. Описание бота
 * 
 * Обратите внимание: используется специальный формат URL без слеша в конце
 * для корректной работы Mini App: https://t.me/UniFarming_Bot/UniFarm
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

// Константы
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const MINI_APP_URL = 'https://t.me/UniFarming_Bot/UniFarm'; // Без слеша!
const APP_NAME = 'UniFarm';

// Проверка наличия токена
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: Переменная окружения TELEGRAM_BOT_TOKEN не определена');
  process.exit(1);
}

// Вспомогательная функция для вызова Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`${API_URL}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error(`❌ Ошибка при вызове метода ${method}:`, error.message);
    return null;
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('📱 Получение информации о боте...');
  const result = await callTelegramApi('getMe');
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка получения информации о боте:', result?.description || 'Неизвестная ошибка');
    process.exit(1);
  }
  
  console.log(`✅ Бот @${result.result.username} (ID: ${result.result.id}) найден`);
  return result.result;
}

// 1. Настройка Menu Button (кнопка на странице бота)
async function setupMenuButton() {
  console.log('🔘 Настройка кнопки меню бота...');
  
  const menuButton = {
    type: 'web_app',
    text: 'Открыть приложение',
    web_app: { url: MINI_APP_URL }
  };
  
  const result = await callTelegramApi('setChatMenuButton', {
    menu_button: menuButton
  });
  
  if (result && result.ok) {
    console.log('✅ Кнопка меню настроена успешно');
  } else {
    console.error('❌ Ошибка при настройке кнопки меню:', result?.description || 'Неизвестная ошибка');
  }
  
  return result;
}

// 2. Настройка команды /start с кнопкой для открытия Mini App
async function setupStartCommand() {
  console.log('🚀 Настройка команды /start с кнопкой...');
  
  // Текст приветственного сообщения
  const welcomeMessage = `
Добро пожаловать в UniFarm!  
Запустить Mini App: ${MINI_APP_URL}
  `;
  
  // Клавиатура с кнопкой для открытия Mini App
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `🚀 Открыть UniFarm`,
          web_app: { url: MINI_APP_URL }
        }
      ]
    ]
  };
  
  // Создаем тестовое сообщение для проверки
  console.log('📱 Создание тестового сообщения команды /start...');
  const result = await callTelegramApi('sendMessage', {
    chat_id: process.env.TEST_CHAT_ID || 'YOUR_CHAT_ID', // ID чата для тестирования
    text: welcomeMessage,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  if (result && result.ok) {
    console.log('✅ Тестовое сообщение команды /start отправлено успешно');
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения /start:', result?.description || 'Неизвестная ошибка');
  }
}

// 3. Настройка команды /app для открытия Mini App
async function setupAppCommand() {
  console.log('🔗 Настройка команды /app...');
  
  // Текст сообщения для команды /app
  const appMessage = `
Перейдите в Mini App: ${MINI_APP_URL}
  `;
  
  // Клавиатура с кнопкой для открытия Mini App
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `🚀 Открыть UniFarm`,
          web_app: { url: MINI_APP_URL }
        }
      ]
    ]
  };
  
  // Создаем тестовое сообщение для проверки
  console.log('📱 Создание тестового сообщения команды /app...');
  const result = await callTelegramApi('sendMessage', {
    chat_id: process.env.TEST_CHAT_ID || 'YOUR_CHAT_ID', // ID чата для тестирования
    text: appMessage,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  if (result && result.ok) {
    console.log('✅ Тестовое сообщение команды /app отправлено успешно');
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения /app:', result?.description || 'Неизвестная ошибка');
  }
}

// 4. Настройка описания бота (About или Description)
async function setupBotDescription() {
  console.log('📝 Настройка описания бота...');
  console.log('ℹ️ Это действие нужно выполнить вручную через BotFather:');
  console.log('1. Отправьте /setdescription боту @BotFather');
  console.log('2. Выберите вашего бота @UniFarming_Bot');
  console.log('3. Отправьте следующий текст:');
  console.log('-------------------------------------------');
  console.log(`Заработок на фарминге $UNI и $TON  
Запуск: ${MINI_APP_URL}`);
  console.log('-------------------------------------------');
}

// 5. Настройка команд бота
async function setupBotCommands() {
  console.log('🛠️ Настройка команд бота...');
  
  const commands = [
    { command: 'start', description: 'Запустить бота и получить приветственное сообщение' },
    { command: 'app', description: 'Открыть Mini App для фарминга и заработка' },
    { command: 'refcode', description: 'Получить ваш реферальный код' },
    { command: 'info', description: 'Информация о вашем аккаунте' },
    { command: 'ping', description: 'Проверка соединения с ботом' }
  ];
  
  const result = await callTelegramApi('setMyCommands', { commands });
  
  if (result && result.ok) {
    console.log('✅ Команды бота настроены успешно');
  } else {
    console.error('❌ Ошибка при настройке команд бота:', result?.description || 'Неизвестная ошибка');
  }
}

// 6. Проверка настроек webhook
async function getWebhookInfo() {
  console.log('🔍 Проверка настроек webhook...');
  const result = await callTelegramApi('getWebhookInfo');
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка получения информации о webhook:', result?.description || 'Неизвестная ошибка');
    return;
  }
  
  console.log('📊 Информация о webhook:');
  console.log(JSON.stringify(result.result, null, 2));
}

// Выполнение всех настроек
async function main() {
  console.log('🔄 Начало настройки Telegram-бота для работы с Mini App...');
  
  // Получаем информацию о боте
  await getBotInfo();
  
  // Настраиваем основные компоненты
  await setupMenuButton();
  await setupStartCommand();
  await setupAppCommand();
  await setupBotCommands();
  await getWebhookInfo();
  
  // Выводим инструкции для ручной настройки
  await setupBotDescription();
  
  console.log('\n✅ Настройка успешно завершена!');
  console.log('⚠️ Не забудьте выполнить ручные настройки через BotFather, как указано выше.');
  console.log('⚠️ Убедитесь, что в URL нет конечного слеша (/)');
  console.log('🔍 Проверьте работу приложения на разных устройствах');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка:', error);
  process.exit(1);
});