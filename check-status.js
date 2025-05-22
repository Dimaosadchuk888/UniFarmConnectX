/**
 * Скрипт для проверки статуса компонентов UniFarm
 * 
 * Проверяет:
 * - Подключение к базе данных
 * - Состояние Telegram бота
 * - Доступность сервера по URL
 * - Настройки TON Connect
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;

// Загружаем переменные окружения
dotenv.config();

// Получаем директорию скрипта
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Целевой URL приложения
const TARGET_APP_URL = 'https://uni-farm-connect-x-lukyanenkolawfa.replit.app';
const WEBHOOK_PATH = '/api/telegram/webhook';

// Токен бота из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

// Основные цвета для вывода
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Функция для вывода сообщений с цветом
 */
function log(message, color = colors.reset) {
  console.log(color, message, colors.reset);
}

/**
 * Вызывает метод Telegram Bot API
 */
async function callTelegramApi(method, data = {}) {
  try {
    if (!BOT_TOKEN) {
      log('⚠️ TELEGRAM_BOT_TOKEN не найден в переменных окружения', colors.yellow);
      return null;
    }
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
    
    // Преобразуем объект в FormData
    const params = new URLSearchParams();
    Object.keys(data).forEach(key => {
      params.append(key, data[key]);
    });
    
    // Отправляем запрос
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });
    
    // Обрабатываем ответ
    const result = await response.json();
    
    if (!result.ok) {
      log(`⚠️ Ошибка API (${method}): ${result.description}`, colors.yellow);
      return null;
    }
    
    return result.result;
  } catch (error) {
    log(`❌ Ошибка при вызове API (${method}): ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Проверяет подключение к базе данных
 */
async function checkDatabase() {
  log('\n📊 Проверка подключения к базе данных...', colors.blue);
  
  try {
    if (!DATABASE_URL) {
      log('⚠️ DATABASE_URL не найден в переменных окружения', colors.yellow);
      return false;
    }
    
    // Создаем клиент PostgreSQL
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Устанавливаем таймаут подключения 5 секунд
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    // Выполняем простой запрос
    const result = await client.query('SELECT current_timestamp as time');
    const time = result.rows[0].time;
    
    // Закрываем соединение
    await client.end();
    
    log(`✅ Успешное подключение к базе данных: ${DATABASE_URL.split('@')[1]}`, colors.green);
    log(`   Время сервера: ${time}`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Ошибка подключения к базе данных: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет настройки TON Connect
 */
async function checkTonConnect() {
  log('\n🔗 Проверка настроек TON Connect...', colors.blue);
  
  try {
    // Пути к возможным файлам манифеста
    const manifestPaths = [
      path.join(__dirname, 'public', 'tonconnect-manifest.json'),
      path.join(__dirname, 'client', 'public', 'tonconnect-manifest.json')
    ];
    
    let manifestFound = false;
    let manifestUrl = null;
    
    // Проверяем наличие и содержимое файлов манифеста
    for (const manifestPath of manifestPaths) {
      if (fs.existsSync(manifestPath)) {
        manifestFound = true;
        
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          manifestUrl = manifest.url;
          
          log(`✅ Найден манифест TON Connect: ${manifestPath}`, colors.green);
          log(`   URL в манифесте: ${manifestUrl}`, colors.green);
          
          if (manifestUrl !== TARGET_APP_URL) {
            log(`⚠️ URL в манифесте не соответствует целевому: ${manifestUrl} !== ${TARGET_APP_URL}`, colors.yellow);
          }
        } catch (parseError) {
          log(`⚠️ Ошибка чтения манифеста: ${parseError.message}`, colors.yellow);
        }
      }
    }
    
    if (!manifestFound) {
      log('⚠️ Файл манифеста TON Connect не найден', colors.yellow);
    }
    
    // Проверяем настройки в клиентском коде
    const configPaths = [
      path.join(__dirname, 'client', 'src', 'config', 'tonConnect.ts'),
      path.join(__dirname, 'export-package', 'client', 'src', 'config', 'tonConnect.ts')
    ];
    
    let configFound = false;
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        configFound = true;
        
        try {
          const config = fs.readFileSync(configPath, 'utf8');
          const manifestUrlMatch = config.match(/TONCONNECT_MANIFEST_URL\s*=\s*['"]([^'"]+)['"]/);
          
          if (manifestUrlMatch) {
            const configManifestUrl = manifestUrlMatch[1];
            log(`✅ Найдена конфигурация TON Connect: ${configPath}`, colors.green);
            log(`   Путь к манифесту: ${configManifestUrl}`, colors.green);
          } else {
            log(`⚠️ Не удалось найти TONCONNECT_MANIFEST_URL в конфигурации`, colors.yellow);
          }
        } catch (readError) {
          log(`⚠️ Ошибка чтения конфигурации: ${readError.message}`, colors.yellow);
        }
      }
    }
    
    if (!configFound) {
      log('⚠️ Файл конфигурации TON Connect не найден', colors.yellow);
    }
    
    return manifestFound && configFound;
  } catch (error) {
    log(`❌ Ошибка при проверке TON Connect: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет состояние Telegram бота
 */
async function checkTelegramBot() {
  log('\n🤖 Проверка состояния Telegram бота...', colors.blue);
  
  try {
    if (!BOT_TOKEN) {
      log('⚠️ TELEGRAM_BOT_TOKEN не найден в переменных окружения', colors.yellow);
      return false;
    }
    
    // Получаем информацию о боте
    const botInfo = await callTelegramApi('getMe');
    if (!botInfo) {
      log('❌ Невозможно получить информацию о боте. Проверьте токен.', colors.red);
      return false;
    }
    
    log(`✅ Бот @${botInfo.username} (${botInfo.first_name}) успешно подключен`, colors.green);
    
    // Получаем информацию о вебхуке
    const webhookInfo = await callTelegramApi('getWebhookInfo');
    if (webhookInfo) {
      log('📡 Информация о вебхуке:', colors.blue);
      log(`   URL: ${webhookInfo.url}`, colors.cyan);
      log(`   Ожидающие обновления: ${webhookInfo.pending_update_count}`, colors.cyan);
      log(`   Последняя ошибка: ${webhookInfo.last_error_message || 'нет'}`, colors.cyan);
      
      const expectedUrl = `${TARGET_APP_URL}${WEBHOOK_PATH}`;
      if (webhookInfo.url === expectedUrl) {
        log(`✅ Вебхук настроен верно на: ${webhookInfo.url}`, colors.green);
      } else {
        log(`⚠️ Вебхук настроен некорректно: ${webhookInfo.url} !== ${expectedUrl}`, colors.yellow);
        log('   Запустите setup-telegram.js для исправления', colors.yellow);
      }
    } else {
      log('⚠️ Не удалось получить информацию о вебхуке', colors.yellow);
    }
    
    return !!botInfo;
  } catch (error) {
    log(`❌ Ошибка при проверке бота: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Проверяет доступность сервера по URL
 */
async function checkServerAvailability() {
  log('\n🌐 Проверка доступности сервера...', colors.blue);
  
  try {
    const response = await fetch(TARGET_APP_URL);
    const status = response.status;
    
    if (status >= 200 && status < 300) {
      log(`✅ Сервер доступен по URL: ${TARGET_APP_URL}`, colors.green);
      log(`   Статус ответа: ${status}`, colors.green);
      return true;
    } else {
      log(`⚠️ Сервер вернул ошибку. Статус: ${status}`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`❌ Сервер недоступен по URL: ${TARGET_APP_URL}`, colors.red);
    log(`   Ошибка: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * Генерирует и выводит итоговый отчет
 */
function generateSummaryReport(results) {
  log('\n📋 ИТОГОВЫЙ ОТЧЕТ', colors.magenta);
  log('==============================', colors.magenta);
  
  const { database, telegram, server, tonConnect } = results;
  
  // Статус базы данных
  if (database) {
    log('✅ База данных: Подключена', colors.green);
  } else {
    log('❌ База данных: Ошибка подключения', colors.red);
  }
  
  // Статус Telegram бота
  if (telegram) {
    log('✅ Telegram бот: Настроен', colors.green);
  } else {
    log('❌ Telegram бот: Ошибка настройки', colors.red);
  }
  
  // Статус сервера
  if (server) {
    log('✅ Web-сервер: Доступен', colors.green);
  } else {
    log('❌ Web-сервер: Недоступен', colors.red);
  }
  
  // Статус TON Connect
  if (tonConnect) {
    log('✅ TON Connect: Настроен', colors.green);
  } else {
    log('⚠️ TON Connect: Проблемы с настройкой', colors.yellow);
  }
  
  // Общий статус
  const overallStatus = database && telegram && server;
  if (overallStatus) {
    log('\n✅ ОБЩИЙ СТАТУС: ГОТОВО К РАБОТЕ', colors.green);
  } else {
    log('\n⚠️ ОБЩИЙ СТАТУС: ТРЕБУЕТСЯ ВНИМАНИЕ', colors.yellow);
  }
  
  // Рекомендации по исправлению
  if (!overallStatus) {
    log('\n📝 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:', colors.cyan);
    
    if (!database) {
      log('1. Проверьте переменную DATABASE_URL в .env', colors.yellow);
      log('   Текущее значение: ' + (DATABASE_URL || 'не задано'), colors.yellow);
    }
    
    if (!telegram) {
      log('2. Запустите настройку Telegram бота:', colors.yellow);
      log('   node setup-telegram.js', colors.yellow);
    }
    
    if (!server) {
      log('3. Проверьте, запущен ли сервер и доступен ли по URL:', colors.yellow);
      log('   ' + TARGET_APP_URL, colors.yellow);
    }
    
    if (!tonConnect) {
      log('4. Проверьте настройки TON Connect в файлах манифеста', colors.yellow);
    }
  }
}

/**
 * Запускает все проверки
 */
async function runAllChecks() {
  log('\n🚀 ЗАПУСК ПРОВЕРКИ СТАТУСА UNIFARM', colors.blue);
  log('==============================\n', colors.blue);
  
  // Результаты проверок
  const results = {
    database: false,
    telegram: false,
    server: false,
    tonConnect: false
  };
  
  // Проверка подключения к базе данных
  results.database = await checkDatabase();
  
  // Проверка состояния Telegram бота
  results.telegram = await checkTelegramBot();
  
  // Проверка доступности сервера
  results.server = await checkServerAvailability();
  
  // Проверка настроек TON Connect
  results.tonConnect = await checkTonConnect();
  
  // Генерируем итоговый отчет
  generateSummaryReport(results);
}

// Запускаем все проверки
runAllChecks().catch(error => {
  log(`❌ Критическая ошибка при выполнении проверок: ${error.message}`, colors.red);
});