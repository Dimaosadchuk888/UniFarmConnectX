/**
 * Специализированный скрипт для настройки команд бота с поддержкой Mini App
 * Создает команды /app и /start с кнопками для открытия Mini App
 */

const fetch = require('node-fetch');

// Константы
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app';
const APP_NAME = 'UniFarm 🚀';

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

// Настройка команды /start с кнопкой для открытия Mini App
async function setupStartCommand() {
  console.log('📱 Настройка команды /start с кнопкой для Mini App...');
  
  // Текст приветственного сообщения
  const welcomeMessage = `
👋 Добро пожаловать в UniFarm!

Начните фарминг и заработок прямо сейчас в нашем Mini App.
Пригласите друзей и получайте реферальные бонусы!

🔽 Нажмите кнопку ниже, чтобы начать 🔽
  `;
  
  // Клавиатура с кнопкой для открытия Mini App
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `Открыть ${APP_NAME}`,
          web_app: { url: APP_URL }
        }
      ],
      [
        {
          text: "Узнать мой реферальный код",
          callback_data: "get_refcode"
        }
      ]
    ]
  };
  
  // Устанавливаем обработчик для команды /start
  console.log('📱 Создание тестового сообщения для проверки...');
  const result = await callTelegramApi('sendMessage', {
    chat_id: process.env.TEST_CHAT_ID || 'YOUR_CHAT_ID', // Замените на ваш ID чата для тестирования
    text: welcomeMessage,
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
  
  if (result && result.ok) {
    console.log('✅ Тестовое сообщение отправлено успешно');
    console.log('📝 ID сообщения:', result.result.message_id);
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения:', result?.description || 'Неизвестная ошибка');
  }
}

// Настройка команды /app для открытия Mini App
async function setupAppCommand() {
  console.log('📱 Настройка команды /app с кнопкой для Mini App...');
  
  // Текст сообщения для команды /app
  const appMessage = `
🚀 UniFarm - ваш путь к крипто-фармингу!

Открывайте приложение для заработка и управления вашим портфолио.
Следите за своими доходами и приглашайте друзей для увеличения прибыли!

🔽 Нажмите кнопку ниже, чтобы открыть Mini App 🔽
  `;
  
  // Клавиатура с кнопкой для открытия Mini App
  const keyboard = {
    inline_keyboard: [
      [
        {
          text: `Открыть ${APP_NAME}`,
          web_app: { url: APP_URL }
        }
      ]
    ]
  };
  
  // Устанавливаем обработчик для команды /app
  console.log('📱 Создание тестового сообщения для проверки...');
  const result = await callTelegramApi('sendMessage', {
    chat_id: process.env.TEST_CHAT_ID || 'YOUR_CHAT_ID', // Замените на ваш ID чата для тестирования
    text: appMessage,
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
  
  if (result && result.ok) {
    console.log('✅ Тестовое сообщение отправлено успешно');
    console.log('📝 ID сообщения:', result.result.message_id);
  } else {
    console.error('❌ Ошибка при отправке тестового сообщения:', result?.description || 'Неизвестная ошибка');
  }
}

// Получение настроек webhook
async function getWebhookInfo() {
  console.log('🔍 Проверка настроек webhook...');
  const result = await callTelegramApi('getWebhookInfo');
  
  if (!result || !result.ok) {
    console.error('❌ Ошибка получения информации о webhook:', result?.description || 'Неизвестная ошибка');
    return;
  }
  
  console.log('📊 Информация о webhook:');
  console.log(JSON.stringify(result.result, null, 2));
  
  // Проверяем, установлен ли webhook на правильный URL
  const webhookUrl = result.result.url;
  const expectedWebhookUrl = `${APP_URL}/api/telegram/webhook`;
  
  if (webhookUrl === expectedWebhookUrl) {
    console.log('✅ Webhook настроен правильно');
  } else {
    console.warn(`⚠️ Webhook настроен на ${webhookUrl}, но ожидается ${expectedWebhookUrl}`);
  }
}

// Получение корректного URL для Mini App 
async function setupBotMenu() {
  console.log('📱 Настройка меню бота с кнопкой для Mini App...');
  
  const menuButton = {
    menu_button: {
      type: 'web_app',
      text: `Открыть ${APP_NAME}`,
      web_app: {
        url: APP_URL
      }
    }
  };
  
  const result = await callTelegramApi('setChatMenuButton', menuButton);
  
  if (result && result.ok) {
    console.log('✅ Меню бота успешно настроено');
  } else {
    console.error('❌ Ошибка при настройке меню бота:', result?.description || 'Неизвестная ошибка');
  }
}

// Основная функция настройки
async function main() {
  console.log('🔧 Начинаем настройку Mini App для Telegram бота...');
  
  try {
    // Получаем информацию о боте
    const botInfo = await getBotInfo();
    
    // Проверяем текущие настройки webhook
    await getWebhookInfo();
    
    // Настраиваем меню бота
    await setupBotMenu();
    
    // Создаем тестовые сообщения для команд /start и /app
    await setupStartCommand();
    await setupAppCommand();
    
    console.log(`\n✅ Настройка Mini App для @${botInfo.username} завершена успешно!`);
    console.log('📱 URL Mini App:', APP_URL);
    console.log('\n📝 Для тестирования используйте команды /start или /app в вашем боте, или нажмите кнопку меню.');
    console.log('💡 Не забудьте настроить Mini App через BotFather, если это еще не сделано.');
  } catch (error) {
    console.error('❌ Произошла ошибка при настройке Mini App:', error.message);
  }
}

// Запускаем основную функцию
main();