/**
 * Скрипт для проверки настроек бота @UniFarming_Bot
 * Проверяет соответствие настроек требованиям технического задания
 */

// Импортируем необходимые модули
import { config } from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';

// Загружаем переменные окружения
config();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Константы для проверки
const REQUIRED_BOT_USERNAME = 'UniFarming_Bot';
const REQUIRED_MINI_APP_URL = 'https://t.me/UniFarming_Bot/UniFarm';
const REQUIRED_WEBHOOK_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app/api/telegram/webhook';
const REQUIRED_MENU_BUTTON_TEXT = 'Открыть приложение';
const REQUIRED_COMMANDS = [
  { command: 'start', description: 'Запустить бота и получить приветственное сообщение' },
  { command: 'app', description: 'Открыть Mini App для фарминга и заработка' },
  { command: 'refcode', description: 'Получить ваш реферальный код' },
  { command: 'info', description: 'Информация о вашем аккаунте' },
  { command: 'ping', description: 'Проверка соединения с ботом' }
];

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
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Ошибка при вызове API ${method}:`, error.message);
    return { ok: false, description: error.message };
  }
}

// Функция для получения данных от API
async function getFromTelegramApi(method) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    const response = await fetch(url);
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Ошибка при получении данных API ${method}:`, error.message);
    return { ok: false, description: error.message };
  }
}

// Функция для проверки URL (доступность, редиректы)
async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      const statusCode = res.statusCode;
      const location = res.headers.location;
      
      resolve({
        url,
        statusCode,
        location,
        isRedirect: statusCode >= 300 && statusCode < 400,
        isOk: statusCode >= 200 && statusCode < 300
      });
    }).on('error', (err) => {
      resolve({
        url,
        error: err.message,
        isOk: false,
        isRedirect: false
      });
    });
  });
}

// Проверка информации о боте
async function checkBotInfo() {
  console.log('🤖 Проверка информации о боте...');
  
  const result = await getFromTelegramApi('getMe');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения информации о боте:', result.description);
    return false;
  }
  
  const botInfo = result.result;
  console.log(`✅ Бот @${botInfo.username} (ID: ${botInfo.id}) найден и доступен`);
  
  // Проверка имени пользователя
  if (botInfo.username !== REQUIRED_BOT_USERNAME) {
    console.warn(`⚠️ Имя пользователя бота (@${botInfo.username}) не соответствует требуемому (@${REQUIRED_BOT_USERNAME})`);
  } else {
    console.log(`✅ Имя пользователя бота (@${botInfo.username}) соответствует требованиям`);
  }
  
  return botInfo;
}

// Проверка команд бота
async function checkBotCommands() {
  console.log('\n📋 Проверка команд бота...');
  
  const result = await getFromTelegramApi('getMyCommands');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения команд бота:', result.description);
    return false;
  }
  
  const commands = result.result;
  console.log(`Найдено ${commands.length} команд:`);
  
  // Проверяем все требуемые команды
  let allCommandsPresent = true;
  
  for (const requiredCmd of REQUIRED_COMMANDS) {
    const foundCmd = commands.find(cmd => cmd.command === requiredCmd.command);
    
    if (!foundCmd) {
      console.error(`❌ Команда /${requiredCmd.command} отсутствует`);
      allCommandsPresent = false;
    } else {
      console.log(`✅ Команда /${requiredCmd.command} настроена`);
      
      // Проверка описания команды (необязательно)
      if (foundCmd.description !== requiredCmd.description) {
        console.warn(`ℹ️ Описание команды /${requiredCmd.command} отличается от рекомендуемого`);
        console.warn(`   Текущее: "${foundCmd.description}"`);
        console.warn(`   Рекомендуемое: "${requiredCmd.description}"`);
      }
    }
  }
  
  if (allCommandsPresent) {
    console.log('✅ Все требуемые команды настроены');
  } else {
    console.error('❌ Некоторые требуемые команды отсутствуют');
  }
  
  return commands;
}

// Проверка кнопки меню
async function checkMenuButton() {
  console.log('\n🔘 Проверка кнопки меню (Menu Button)...');
  
  const result = await callTelegramApi('getChatMenuButton');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения информации о кнопке меню:', result.description);
    return false;
  }
  
  const menuButton = result.result;
  
  // Проверяем тип кнопки
  if (menuButton.type !== 'web_app') {
    console.error(`❌ Тип кнопки меню (${menuButton.type}) не соответствует требуемому (web_app)`);
    return false;
  }
  
  console.log('✅ Тип кнопки меню (web_app) соответствует требованиям');
  
  // Проверяем текст кнопки
  if (menuButton.text !== REQUIRED_MENU_BUTTON_TEXT) {
    console.warn(`⚠️ Текст кнопки меню ("${menuButton.text}") не соответствует требуемому ("${REQUIRED_MENU_BUTTON_TEXT}")`);
  } else {
    console.log(`✅ Текст кнопки меню ("${menuButton.text}") соответствует требованиям`);
  }
  
  // Проверяем URL
  const menuUrl = menuButton.web_app?.url;
  
  if (!menuUrl) {
    console.error('❌ URL для кнопки меню отсутствует');
    return false;
  }
  
  console.log(`ℹ️ URL кнопки меню: ${menuUrl}`);
  
  if (menuUrl !== REQUIRED_MINI_APP_URL) {
    console.error(`❌ URL кнопки меню не соответствует требуемому`);
    console.error(`   Текущий: ${menuUrl}`);
    console.error(`   Требуемый: ${REQUIRED_MINI_APP_URL}`);
  } else {
    console.log('✅ URL кнопки меню соответствует требованиям');
  }
  
  // Проверяем наличие слеша в конце URL
  if (menuUrl.endsWith('/')) {
    console.error('❌ URL кнопки меню содержит слеш в конце, что не соответствует ТЗ');
  } else {
    console.log('✅ URL кнопки меню не содержит слеш в конце, что соответствует ТЗ');
  }
  
  return menuButton;
}

// Проверка webhook
async function checkWebhook() {
  console.log('\n🔄 Проверка настроек webhook...');
  
  const result = await getFromTelegramApi('getWebhookInfo');
  
  if (!result.ok) {
    console.error('❌ Ошибка получения информации о webhook:', result.description);
    return false;
  }
  
  const webhookInfo = result.result;
  
  // Проверяем, установлен ли webhook
  if (!webhookInfo.url) {
    console.error('❌ Webhook не установлен');
    return false;
  }
  
  console.log(`ℹ️ Текущий webhook URL: ${webhookInfo.url}`);
  
  // Проверяем URL webhook
  if (webhookInfo.url !== REQUIRED_WEBHOOK_URL) {
    console.warn(`⚠️ URL webhook не соответствует рекомендуемому`);
    console.warn(`   Текущий: ${webhookInfo.url}`);
    console.warn(`   Рекомендуемый: ${REQUIRED_WEBHOOK_URL}`);
  } else {
    console.log('✅ URL webhook соответствует рекомендуемому');
  }
  
  // Проверяем ошибки webhook
  if (webhookInfo.last_error_date) {
    const errorDate = new Date(webhookInfo.last_error_date * 1000);
    console.error(`❌ Последняя ошибка webhook: ${webhookInfo.last_error_message} (${errorDate.toLocaleString()})`);
  } else {
    console.log('✅ Ошибок webhook не обнаружено');
  }
  
  return webhookInfo;
}

// Проверка доступности URL Mini App
async function checkMiniAppUrl() {
  console.log('\n🔍 Проверка доступности URL Mini App...');
  
  // Проверяем основной URL
  console.log(`ℹ️ Проверяем URL: ${REQUIRED_MINI_APP_URL}`);
  const urlCheck = await checkUrl(REQUIRED_MINI_APP_URL);
  
  if (urlCheck.error) {
    console.error(`❌ Ошибка при проверке URL: ${urlCheck.error}`);
  } else if (urlCheck.isRedirect) {
    console.warn(`⚠️ URL перенаправляет на: ${urlCheck.location} (код ${urlCheck.statusCode})`);
  } else if (urlCheck.isOk) {
    console.log(`✅ URL доступен (код ${urlCheck.statusCode})`);
  } else {
    console.error(`❌ URL недоступен (код ${urlCheck.statusCode})`);
  }
  
  // Проверяем URL с завершающим слешем
  const urlWithSlash = `${REQUIRED_MINI_APP_URL}/`;
  console.log(`ℹ️ Проверяем URL с завершающим слешем: ${urlWithSlash}`);
  const slashUrlCheck = await checkUrl(urlWithSlash);
  
  if (slashUrlCheck.error) {
    console.error(`❌ Ошибка при проверке URL: ${slashUrlCheck.error}`);
  } else if (slashUrlCheck.isRedirect) {
    console.log(`✅ URL с завершающим слешем перенаправляет на: ${slashUrlCheck.location} (код ${slashUrlCheck.statusCode})`);
  } else if (slashUrlCheck.isOk) {
    console.warn(`⚠️ URL с завершающим слешем доступен напрямую (код ${slashUrlCheck.statusCode}), ожидалось перенаправление`);
  } else {
    console.error(`❌ URL с завершающим слешем недоступен (код ${slashUrlCheck.statusCode})`);
  }
  
  return { urlCheck, slashUrlCheck };
}

// Проверка мета-тегов
async function checkMetaTags() {
  console.log('\n🏷️ Проверка мета-тегов на странице Mini App...');
  console.log('ℹ️ Эта проверка требует ручной проверки. Убедитесь, что страница содержит следующие мета-теги:');
  console.log('1. <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />');
  console.log('2. <meta name="telegram-web-app-ready" content="true" />');
  console.log('3. <meta name="format-detection" content="telephone=no" />');
  console.log('4. <meta name="color-scheme" content="light dark" />');
}

// Составление итогового отчета
function generateSummary() {
  console.log('\n📝 ИТОГОВЫЙ ОТЧЕТ ПО РЕЗУЛЬТАТАМ ПРОВЕРКИ');
  console.log('===========================================');
  console.log('1. Проверка URL:');
  console.log(`   - Корректный формат URL без слеша: ${REQUIRED_MINI_APP_URL}`);
  console.log(`   - ВАЖНО: Убедитесь, что этот URL используется во всех сообщениях и кнопках`);
  console.log('\n2. Требования к боту согласно ТЗ:');
  console.log('   - Menu Button в профиле бота: текст "Открыть приложение"');
  console.log('   - Приветственное сообщение должно содержать кнопку "🚀 Открыть UniFarm"');
  console.log('   - Команда /app должна содержать текст и кнопку для открытия Mini App');
  console.log('   - Команда /start должна содержать приветствие и кнопку для открытия Mini App');
  console.log('\n3. Рекомендации:');
  console.log('   - Проверьте работу на разных устройствах (iOS, Android, Desktop)');
  console.log('   - Убедитесь, что нет ошибки "Приложение не открыто из Telegram"');
  console.log('   - Проверьте корректность отображения Mini App внутри Telegram');
  console.log('===========================================');
}

// Главная функция
async function main() {
  console.log('🚀 Запуск проверки настроек бота @UniFarming_Bot...');
  
  // Проверяем информацию о боте
  const botInfo = await checkBotInfo();
  if (!botInfo) return;
  
  // Проверяем команды бота
  await checkBotCommands();
  
  // Проверяем кнопку меню
  await checkMenuButton();
  
  // Проверяем webhook
  await checkWebhook();
  
  // Проверяем URL Mini App
  await checkMiniAppUrl();
  
  // Проверяем мета-теги
  await checkMetaTags();
  
  // Выводим итоговый отчет
  generateSummary();
  
  console.log('\n✅ Проверка завершена!');
}

// Запуск скрипта
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
});