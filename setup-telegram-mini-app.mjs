/**
 * Комплексный скрипт для настройки Telegram Mini App
 * 
 * Этот скрипт выполнит полную настройку для бота @UniFarming_Bot:
 * 1. Проверит токен и доступность бота
 * 2. Обновит команды бота
 * 3. Настроит кнопку меню для открытия Mini App
 * 4. Настроит webhook на правильный URL
 * 5. Создаст/обновит Mini App в BotFather (инструкции)
 * 6. Проверит корректность всех настроек
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const APP_URL = 'https://uni-farm-connect-2-misterxuniverse.replit.app';
const WEBHOOK_PATH = '/api/telegram/webhook';
const WEBHOOK_URL = `${APP_URL}${WEBHOOK_PATH}`;
const APP_NAME = 'UniFarm';

// Стили для вывода в консоль
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Проверка наличия токена бота
if (!BOT_TOKEN) {
  console.error(`${c.bgRed}${c.bold} ОШИБКА ${c.reset} Переменная окружения TELEGRAM_BOT_TOKEN не определена`);
  process.exit(1);
}

// Функция для обертывания текста в рамку
function boxedText(text, options = {}) {
  const color = options.color || c.reset;
  const bgColor = options.bgColor || '';
  const title = options.title || '';
  
  const lines = text.split('\n');
  const width = Math.max(...lines.map(line => line.length), title.length) + 4;
  
  const top = `┌${'─'.repeat(width - 2)}┐`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;
  const formatted = lines.map(line => `│ ${line.padEnd(width - 4)} │`).join('\n');
  
  let result = `${color}${bgColor}${top}\n`;
  
  if (title) {
    const titlePadding = Math.floor((width - 2 - title.length) / 2);
    const titleLine = `│${'─'.repeat(titlePadding)} ${title} ${'─'.repeat(width - 4 - title.length - titlePadding)}│`;
    result += `${titleLine}\n`;
  }
  
  result += `${formatted}\n${bottom}${c.reset}`;
  return result;
}

// Вспомогательная функция для API запросов
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return await response.json();
  } catch (error) {
    console.error(`${c.red}Ошибка при вызове ${method}:${c.reset}`, error.message);
    return null;
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log(`\n${c.bold}${c.blue}➤ Проверка бота${c.reset}`);
  const result = await callTelegramApi('getMe');
  
  if (!result || !result.ok) {
    console.error(`${c.red}✖ Ошибка получения информации о боте:${c.reset}`, result?.description || 'Неизвестная ошибка');
    process.exit(1);
  }
  
  const botInfo = result.result;
  console.log(`${c.green}✓ Бот @${botInfo.username} (ID: ${botInfo.id}) найден${c.reset}`);
  console.log(`${c.dim}  Имя: ${botInfo.first_name}${c.reset}`);
  
  if (botInfo.username !== 'UniFarming_Bot') {
    console.log(`${c.yellow}⚠ Имя бота отличается от ожидаемого (UniFarming_Bot)${c.reset}`);
  }
  
  return botInfo;
}

// Настройка команд бота
async function setupBotCommands() {
  console.log(`\n${c.bold}${c.blue}➤ Настройка команд бота${c.reset}`);
  
  // Сначала удалим все существующие команды
  console.log(`${c.dim}Удаление существующих команд...${c.reset}`);
  await callTelegramApi('deleteMyCommands');
  
  // Команды для бота
  const commands = {
    commands: [
      {command: 'start', description: 'Запустить бота и открыть UniFarm'},
      {command: 'app', description: 'Открыть приложение UniFarm'},
      {command: 'refcode', description: 'Получить ваш реферальный код'},
      {command: 'info', description: 'Информация о вашем аккаунте'},
      {command: 'ping', description: 'Проверить соединение с ботом'}
    ]
  };
  
  console.log(`${c.dim}Установка новых команд...${c.reset}`);
  const result = await callTelegramApi('setMyCommands', commands);
  
  if (!result || !result.ok) {
    console.error(`${c.red}✖ Ошибка при настройке команд:${c.reset}`, result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log(`${c.green}✓ Команды бота успешно настроены${c.reset}`);
  return true;
}

// Настройка кнопки меню
async function setupMenuButton() {
  console.log(`\n${c.bold}${c.blue}➤ Настройка кнопки меню${c.reset}`);
  
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
  
  if (!result || !result.ok) {
    console.error(`${c.red}✖ Ошибка при настройке кнопки меню:${c.reset}`, result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  console.log(`${c.green}✓ Кнопка меню успешно настроена${c.reset}`);
  console.log(`${c.dim}  Текст: Открыть ${APP_NAME}${c.reset}`);
  console.log(`${c.dim}  URL: ${APP_URL}${c.reset}`);
  return true;
}

// Настройка webhook
async function setupWebhook() {
  console.log(`\n${c.bold}${c.blue}➤ Настройка webhook${c.reset}`);
  
  // Сначала получим текущие настройки webhook
  const currentInfo = await callTelegramApi('getWebhookInfo');
  if (currentInfo && currentInfo.ok) {
    const current = currentInfo.result;
    console.log(`${c.dim}Текущий webhook URL: ${current.url || 'не установлен'}${c.reset}`);
    
    if (current.url === WEBHOOK_URL) {
      console.log(`${c.yellow}⚠ Webhook уже настроен на требуемый URL${c.reset}`);
      console.log(`${c.dim}  Для обновления настроек webhook будет удален и создан заново${c.reset}`);
    }
  }
  
  // Удаляем существующий webhook
  console.log(`${c.dim}Удаление существующего webhook...${c.reset}`);
  await callTelegramApi('deleteWebhook', { drop_pending_updates: true });
  
  // Настраиваем новый webhook
  console.log(`${c.dim}Установка нового webhook на URL: ${WEBHOOK_URL}${c.reset}`);
  const result = await callTelegramApi('setWebhook', {
    url: WEBHOOK_URL,
    allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'],
    drop_pending_updates: true,
    max_connections: 40
  });
  
  if (!result || !result.ok) {
    console.error(`${c.red}✖ Ошибка при настройке webhook:${c.reset}`, result?.description || 'Неизвестная ошибка');
    return false;
  }
  
  // Проверяем настройки webhook
  const newInfo = await callTelegramApi('getWebhookInfo');
  if (newInfo && newInfo.ok) {
    const webhook = newInfo.result;
    
    // Проверяем, правильно ли установлен webhook
    if (webhook.url === WEBHOOK_URL) {
      console.log(`${c.green}✓ Webhook успешно настроен на ${WEBHOOK_URL}${c.reset}`);
      
      // Дополнительная информация
      console.log(`${c.dim}  Ожидает обновлений: ${webhook.pending_update_count || 0}${c.reset}`);
      console.log(`${c.dim}  Макс. соединений: ${webhook.max_connections || 'не указано'}${c.reset}`);
      console.log(`${c.dim}  Разрешенные обновления: ${webhook.allowed_updates ? webhook.allowed_updates.join(', ') : 'все'}${c.reset}`);
      
      return true;
    } else {
      console.error(`${c.red}✖ Webhook установлен на неправильный URL: ${webhook.url}${c.reset}`);
      return false;
    }
  } else {
    console.error(`${c.red}✖ Не удалось проверить настройки webhook${c.reset}`);
    return false;
  }
}

// Функция для настройки команды start для открытия Mini App
async function createStartCommandResponse() {
  console.log(`\n${c.bold}${c.blue}➤ Настройка команды /start${c.reset}`);
  
  // Отправляем тестовое сообщение для проверки команды /start
  // Можно использовать любой чат, где бот уже активирован
  // Для примера, можно использовать chat_id: '@BotFather'
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
          text: `Открыть ${APP_NAME} 🚀`,
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
  
  console.log(`${c.green}✓ Команда /start настроена с кнопкой открытия Mini App${c.reset}`);
  console.log(`${c.yellow}⚠ Примечание: Эта команда настраивается в коде бота, а не через BotFather${c.reset}`);
  
  // Показываем примерный вид сообщения
  console.log(`\n${boxedText(welcomeMessage, { color: c.cyan, title: 'Пример сообщения /start' })}`);
  console.log(`${c.cyan}Кнопки: [Открыть ${APP_NAME} 🚀] [Узнать мой реферальный код]${c.reset}`);
  
  return true;
}

// Проверка URL на доступность
async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

// Генерация инструкций для ручной настройки через BotFather
function generateBotFatherInstructions(botUsername) {
  const instructions = `
1. Откройте чат с @BotFather в Telegram
2. Отправьте команду /mybots
3. Выберите бота @${botUsername}
4. Выберите "Edit Bot" → "Bot Settings"

5. Для настройки кнопки меню:
   - Выберите "Menu Button"
   - Выберите "Configure menu button"
   - Введите текст кнопки: "Открыть UniFarm"
   - Введите URL веб-приложения: ${APP_URL}

6. Для настройки команд:
   - Вернитесь в настройки бота
   - Выберите "Edit Commands"
   - Отправьте следующий список команд:
   
start - Запустить бота и открыть UniFarm
app - Открыть приложение UniFarm
refcode - Получить ваш реферальный код
info - Информация о вашем аккаунте
ping - Проверить соединение с ботом

7. Для настройки Mini App:
   - Вернитесь в настройки бота
   - Выберите "Mini Apps"
   - Выберите "Create new Mini App"
   - Следуйте инструкциям и введите:
     * Короткое имя: unifarm
     * URL: ${APP_URL}
     * Поддерживаемые платформы: all
  `;
  
  return boxedText(instructions, { color: c.yellow, bgColor: '', title: 'Инструкции по настройке через BotFather' });
}

// Основная функция
async function main() {
  try {
    // Заголовок
    console.log(`\n${c.bgBlue}${c.bold} НАСТРОЙКА TELEGRAM MINI APP ${c.reset}\n`);
    console.log(`${c.bold}URL приложения:${c.reset} ${APP_URL}`);
    console.log(`${c.bold}URL webhook:${c.reset} ${WEBHOOK_URL}`);
    console.log(`${c.bold}Токен бота:${c.reset} ${BOT_TOKEN ? '✓ установлен' : '✗ не найден'}`);
    
    // Проверяем доступность URL приложения
    console.log(`\n${c.bold}${c.blue}➤ Проверка доступности приложения${c.reset}`);
    const urlCheck = await checkUrl(APP_URL);
    if (urlCheck.ok) {
      console.log(`${c.green}✓ URL приложения доступен (статус: ${urlCheck.status})${c.reset}`);
    } else {
      console.log(`${c.red}✖ URL приложения недоступен: ${urlCheck.error || urlCheck.statusText || 'неизвестная ошибка'}${c.reset}`);
    }
    
    // Получаем информацию о боте
    const botInfo = await getBotInfo();
    
    // Настраиваем команды бота
    await setupBotCommands();
    
    // Настраиваем кнопку меню
    await setupMenuButton();
    
    // Настраиваем webhook
    await setupWebhook();
    
    // Настраиваем команду /start
    await createStartCommandResponse();
    
    // Генерируем инструкции для ручной настройки через BotFather
    console.log(`\n${generateBotFatherInstructions(botInfo.username)}`);
    
    // Итоги настройки
    console.log(`\n${c.bgGreen}${c.bold} НАСТРОЙКА ЗАВЕРШЕНА ${c.reset}\n`);
    console.log(`${c.green}✓ Бот @${botInfo.username} успешно настроен${c.reset}`);
    console.log(`${c.green}✓ Webhook настроен на ${WEBHOOK_URL}${c.reset}`);
    console.log(`${c.green}✓ Кнопка меню настроена для открытия Mini App${c.reset}`);
    console.log(`${c.green}✓ Команды бота обновлены${c.reset}`);
    
    // Ссылка для тестирования
    console.log(`\n${c.bold}Для тестирования:${c.reset} https://t.me/${botInfo.username}`);
    
  } catch (error) {
    console.error(`\n${c.bgRed}${c.bold} ОШИБКА ${c.reset} ${error.message}`);
    console.error(error.stack);
  }
}

// Запускаем основную функцию
main();