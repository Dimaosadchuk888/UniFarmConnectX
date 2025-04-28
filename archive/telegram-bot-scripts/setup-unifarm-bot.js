/**
 * Универсальный скрипт настройки Telegram-бота для UniFarm
 * согласно техническому заданию
 */

// Загружаем переменные окружения
require('dotenv').config();
const fetch = require('node-fetch');

// Основные константы
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = 'UniFarming_Bot';
const MINI_APP_URL = `https://t.me/${BOT_USERNAME}/UniFarm`; // Важно: без слеша в конце!
const WEBHOOK_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app/api/telegram/webhook';

// Проверка наличия токена
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: Переменная окружения TELEGRAM_BOT_TOKEN не определена');
  process.exit(1);
}

// Функция для вызова Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове API ${method}:`, error.message);
    return { ok: false, description: error.message };
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('🤖 Получение информации о боте...');
  const result = await callTelegramApi('getMe');
  
  if (result.ok) {
    console.log(`✅ Бот @${result.result.username} (ID: ${result.result.id}) найден и доступен`);
    return result.result;
  } else {
    console.error('❌ Ошибка получения информации о боте:', result.description);
    process.exit(1);
  }
}

// 1. Настройка команд бота
async function setupBotCommands() {
  console.log('📋 Настройка команд бота...');
  
  const commands = [
    { command: 'start', description: 'Запустить бота и получить приветственное сообщение' },
    { command: 'app', description: 'Открыть UniFarm Mini App' },
    { command: 'refcode', description: 'Получить ваш реферальный код' },
    { command: 'info', description: 'Информация о вашем аккаунте' },
    { command: 'ping', description: 'Проверка соединения с ботом' }
  ];
  
  const result = await callTelegramApi('setMyCommands', { commands });
  
  if (result.ok) {
    console.log('✅ Команды бота настроены успешно');
  } else {
    console.error('❌ Ошибка при настройке команд бота:', result.description);
  }
}

// 2. Настройка кнопки меню (Menu Button)
async function setupMenuButton() {
  console.log('🔘 Настройка кнопки меню (Menu Button)...');
  
  const result = await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Открыть приложение',
      web_app: { url: MINI_APP_URL }
    }
  });
  
  if (result.ok) {
    console.log('✅ Кнопка меню настроена успешно');
  } else {
    console.error('❌ Ошибка при настройке кнопки меню:', result.description);
  }
}

// 3. Настройка webhook для получения обновлений
async function setupWebhook() {
  console.log('🔄 Настройка webhook для получения сообщений...');
  
  // Сначала удаляем текущий webhook (если есть)
  const deleteResult = await callTelegramApi('deleteWebhook', { drop_pending_updates: true });
  
  if (deleteResult.ok) {
    console.log('✓ Предыдущий webhook удален');
  } else {
    console.error('❌ Ошибка при удалении предыдущего webhook:', deleteResult.description);
  }
  
  // Устанавливаем новый webhook
  const setResult = await callTelegramApi('setWebhook', {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'callback_query'],
  });
  
  if (setResult.ok) {
    console.log(`✅ Webhook установлен на: ${WEBHOOK_URL}`);
  } else {
    console.error('❌ Ошибка при установке webhook:', setResult.description);
  }
}

// 4. Получение информации о текущем webhook
async function getWebhookInfo() {
  console.log('ℹ️ Получение информации о webhook...');
  
  const result = await callTelegramApi('getWebhookInfo');
  
  if (result.ok) {
    console.log('📊 Информация о webhook:');
    console.log(`URL: ${result.result.url}`);
    console.log(`Последняя ошибка: ${result.result.last_error_message || 'нет'}`);
    console.log(`Последний успешный запрос: ${result.result.last_synchronization_error_date ? new Date(result.result.last_synchronization_error_date * 1000).toLocaleString() : 'нет данных'}`);
    console.log(`Ожидающие обновления: ${result.result.pending_update_count}`);
  } else {
    console.error('❌ Ошибка при получении информации о webhook:', result.description);
  }
}

// 5. Инструкции для BotFather
function showBotFatherInstructions() {
  console.log('\n');
  console.log('📌 ИНСТРУКЦИИ ДЛЯ РУЧНОЙ НАСТРОЙКИ ЧЕРЕЗ BOTFATHER');
  console.log('===============================================');
  console.log('1. Откройте чат с @BotFather в Telegram');
  console.log('2. Для настройки описания бота:');
  console.log('   Отправьте команду /setdescription');
  console.log('   Выберите бота @UniFarming_Bot');
  console.log('   Отправьте текст:');
  console.log('   --------------------------------------------------');
  console.log(`   Заработок на фарминге $UNI и $TON  
Запуск: ${MINI_APP_URL}`);
  console.log('   --------------------------------------------------');
  console.log('\n3. Для настройки Mini App в BotFather:');
  console.log('   Отправьте команду /newapp');
  console.log('   Выберите бота @UniFarming_Bot');
  console.log('   Следуйте инструкциям, указав:');
  console.log('   - Название: UniFarm');
  console.log('   - Короткое имя: UniFarm');
  console.log('   - URL: https://uni-farm-connect-2-misterxuniverse.replit.app');
  console.log('\n4. ВАЖНО: убедитесь, что в ссылках на Mini App нет слеша в конце!');
  console.log('   Правильно: https://t.me/UniFarming_Bot/UniFarm');
  console.log('   НЕПРАВИЛЬНО: https://t.me/UniFarming_Bot/UniFarm/');
  console.log('===============================================');
}

// 6. Создаем тестовое сообщение с командой /start
async function sendTestStartMessage() {
  const testChatId = process.env.TEST_CHAT_ID;
  
  if (!testChatId) {
    console.log('ℹ️ Тестовое сообщение не отправлено: переменная TEST_CHAT_ID не указана');
    return;
  }
  
  console.log('📤 Отправка тестового сообщения с командой /start...');
  
  const welcomeText = `Добро пожаловать в UniFarm!  
Запустить Mini App: ${MINI_APP_URL}`;
  
  const result = await callTelegramApi('sendMessage', {
    chat_id: testChatId,
    text: welcomeText,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Открыть UniFarm', web_app: { url: MINI_APP_URL } }]
      ]
    }
  });
  
  if (result.ok) {
    console.log('✅ Тестовое сообщение отправлено успешно');
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения:', result.description);
  }
}

// 7. Создаем тестовое сообщение с командой /app
async function sendTestAppMessage() {
  const testChatId = process.env.TEST_CHAT_ID;
  
  if (!testChatId) {
    console.log('ℹ️ Тестовое сообщение не отправлено: переменная TEST_CHAT_ID не указана');
    return;
  }
  
  console.log('📤 Отправка тестового сообщения с командой /app...');
  
  const appText = `Перейдите в Mini App: ${MINI_APP_URL}`;
  
  const result = await callTelegramApi('sendMessage', {
    chat_id: testChatId,
    text: appText,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Открыть UniFarm', web_app: { url: MINI_APP_URL } }]
      ]
    }
  });
  
  if (result.ok) {
    console.log('✅ Тестовое сообщение отправлено успешно');
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения:', result.description);
  }
}

// Главная функция
async function main() {
  console.log('🚀 Запуск настройки Telegram-бота для UniFarm...');
  console.log(`📱 Mini App URL: ${MINI_APP_URL}`);
  
  await getBotInfo();
  await setupBotCommands();
  await setupMenuButton();
  await setupWebhook();
  await getWebhookInfo();
  
  // Если указан тестовый чат, отправляем тестовые сообщения
  if (process.env.TEST_CHAT_ID) {
    await sendTestStartMessage();
    await sendTestAppMessage();
  }
  
  showBotFatherInstructions();
  
  console.log('\n✅ Настройка бота успешно завершена!');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
});