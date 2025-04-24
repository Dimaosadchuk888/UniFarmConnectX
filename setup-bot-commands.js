/**
 * Скрипт для настройки команд и кнопок бота @UniFarming_Bot
 * Выполняет настройку всех необходимых команд и элементов интерфейса
 * согласно техническому заданию.
 */

const fs = require('fs');
require('dotenv').config();

const botToken = process.env.TELEGRAM_BOT_TOKEN || '';

if (!botToken) {
  console.error('❌ Ошибка: Не указан токен бота (TELEGRAM_BOT_TOKEN) в .env файле');
  process.exit(1);
}

// Общие настройки
const BOT_USERNAME = 'UniFarming_Bot';
const MINI_APP_URL = `https://t.me/${BOT_USERNAME}/UniFarm`;

// Функция для вызова Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!result.ok) {
      console.error(`❌ Ошибка при вызове ${method}:`, result.description);
      return null;
    }
    
    return result.result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${method}:`, error.message);
    return null;
  }
}

// Получение информации о боте
async function getBotInfo() {
  console.log('🔍 Получение информации о боте...');
  const botInfo = await callTelegramApi('getMe');
  
  if (botInfo) {
    console.log(`✅ Бот @${botInfo.username} (${botInfo.first_name}) успешно подключен`);
  }
  
  return botInfo;
}

// Настройка команд бота
async function setupBotCommands() {
  console.log('⚙️ Настройка команд бота...');
  
  const commands = [
    {
      command: 'start',
      description: 'Запустить бота и получить приветствие'
    },
    {
      command: 'app',
      description: 'Открыть UniFarm Mini App'
    },
    {
      command: 'info',
      description: 'Информация о пользователе'
    },
    {
      command: 'refcode',
      description: 'Получить реферальный код'
    },
    {
      command: 'ping',
      description: 'Проверить работу бота'
    }
  ];
  
  const result = await callTelegramApi('setMyCommands', { 
    commands: commands
  });
  
  if (result) {
    console.log('✅ Команды бота успешно настроены');
  }
  
  return result;
}

// Настройка кнопки меню
async function setupMenuButton() {
  console.log('⚙️ Настройка кнопки меню в профиле бота...');
  
  const result = await callTelegramApi('setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Открыть приложение',
      web_app: {
        url: MINI_APP_URL
      }
    }
  });
  
  if (result !== null) {
    console.log('✅ Кнопка меню успешно настроена');
  }
  
  return result;
}

// Обновление описания бота
async function updateBotDescription() {
  console.log('⚙️ Обновление описания бота...');
  
  const description = `Заработок на фарминге $UNI и $TON\nЗапуск: ${MINI_APP_URL}`;
  
  const result = await callTelegramApi('setMyDescription', {
    description: description
  });
  
  if (result) {
    console.log('✅ Описание бота успешно обновлено');
  }
  
  return result;
}

// Обновление обработчика команды /start в файле telegramBot.js или telegramBot.ts
async function updateStartCommandHandler() {
  console.log('⚙️ Обновление обработчика команды /start...');
  
  // Определяем, какой файл существует
  const jsFilePath = './server/telegramBot.js';
  const tsFilePath = './server/telegramBot.ts';
  
  let filePath = '';
  let fileContent = '';
  
  if (fs.existsSync(jsFilePath)) {
    filePath = jsFilePath;
    fileContent = fs.readFileSync(jsFilePath, 'utf8');
  } else if (fs.existsSync(tsFilePath)) {
    filePath = tsFilePath;
    fileContent = fs.readFileSync(tsFilePath, 'utf8');
  } else {
    console.error('❌ Не найден файл telegramBot.js или telegramBot.ts');
    return false;
  }
  
  // Создаем новый обработчик команды /start
  const newStartHandler = filePath.endsWith('.ts') ? 
    `async function handleStartCommand(chatId: number, { userId, username, firstName }: { userId: number, username?: string, firstName?: string }): Promise<any> {
  const welcomeText = \`Добро пожаловать в UniFarm!
  
Здесь вы можете заниматься фармингом криптовалюты и приглашать друзей по партнерской программе.

Запустить Mini App: ${MINI_APP_URL}\`;

  return sendMessage(chatId, welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: "${MINI_APP_URL}" } }]
      ]
    },
    parse_mode: "Markdown"
  });
}` :
    `async function handleStartCommand(chatId, { userId, username, firstName }) {
  const welcomeText = \`Добро пожаловать в UniFarm!
  
Здесь вы можете заниматься фармингом криптовалюты и приглашать друзей по партнерской программе.

Запустить Mini App: ${MINI_APP_URL}\`;

  return sendMessage(chatId, welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: "${MINI_APP_URL}" } }]
      ]
    },
    parse_mode: "Markdown"
  });
}`;

  // Создаем новый обработчик команды /app
  const newAppHandler = filePath.endsWith('.ts') ? 
    `async function handleAppCommand(chatId: number): Promise<any> {
  const appText = \`Перейдите в Mini App: ${MINI_APP_URL}\`;

  return sendMessage(chatId, appText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: "${MINI_APP_URL}" } }]
      ]
    }
  });
}` :
    `async function handleAppCommand(chatId) {
  const appText = \`Перейдите в Mini App: ${MINI_APP_URL}\`;

  return sendMessage(chatId, appText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Открыть UniFarm", web_app: { url: "${MINI_APP_URL}" } }]
      ]
    }
  });
}`;
  
  // Если функция handleStartCommand уже есть, заменяем её
  let updatedContent = fileContent;
  
  // Заменяем функцию handleStartCommand
  if (fileContent.includes('function handleStartCommand')) {
    const startRegex = filePath.endsWith('.ts') ?
      /async function handleStartCommand\(chatId: number,.*?\): Promise<any> {[\s\S]*?}/m :
      /async function handleStartCommand\(chatId,.*?\) {[\s\S]*?}/m;
    
    updatedContent = updatedContent.replace(startRegex, newStartHandler);
  }
  
  // Заменяем или добавляем функцию handleAppCommand
  if (fileContent.includes('function handleAppCommand')) {
    const appRegex = filePath.endsWith('.ts') ?
      /async function handleAppCommand\(chatId: number\): Promise<any> {[\s\S]*?}/m :
      /async function handleAppCommand\(chatId\) {[\s\S]*?}/m;
    
    updatedContent = updatedContent.replace(appRegex, newAppHandler);
  } else {
    // Добавляем функцию handleAppCommand после handleStartCommand
    updatedContent = updatedContent.replace(newStartHandler, `${newStartHandler}\n\n${newAppHandler}`);
  }
  
  // Проверяем, что в обработчике команд есть case для /app
  if (!fileContent.includes("case '/app':")) {
    // Ищем блок switch для обработки команд
    const switchCaseRegex = /switch\s*\(\s*command\s*\)\s*{[\s\S]*?}/m;
    let switchCaseMatch = updatedContent.match(switchCaseRegex);
    
    if (switchCaseMatch) {
      const switchCaseBlock = switchCaseMatch[0];
      // Добавляем обработку команды /app перед default или последней закрывающей скобкой
      const newSwitchCase = switchCaseBlock.includes('default:') ?
        switchCaseBlock.replace(/default:/, `case '/app':\n        return handleAppCommand(chatId);\n\n      default:`) :
        switchCaseBlock.replace(/}$/, `      case '/app':\n        return handleAppCommand(chatId);\n}`);
      
      updatedContent = updatedContent.replace(switchCaseBlock, newSwitchCase);
    }
  }
  
  // Записываем обновленный файл
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`✅ Файл ${filePath} успешно обновлен`);
  
  return true;
}

// Главная функция
async function main() {
  console.log('🚀 Запуск настройки бота @UniFarming_Bot...');
  console.log(`👉 Будет использована ссылка: ${MINI_APP_URL}`);
  
  // Проверяем существование и доступность бота
  const botInfo = await getBotInfo();
  if (!botInfo) return;
  
  // Настраиваем команды
  await setupBotCommands();
  
  // Настраиваем кнопку меню
  await setupMenuButton();
  
  // Обновляем описание
  await updateBotDescription();
  
  // Обновляем обработчики команд
  await updateStartCommandHandler();
  
  console.log('✅ Настройка бота успешно завершена!');
  console.log(`✅ Mini App URL: ${MINI_APP_URL}`);
}

// Запускаем скрипт
main().catch(error => {
  console.error('❌ Произошла ошибка при выполнении скрипта:', error);
});