/**
 * Скрипт для настройки webhook Telegram бота (ESM версия)
 * 
 * Запуск: node setup-webhook.mjs
 */

import fetch from 'node-fetch';

// Токен Telegram бота из переменных окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Получаем URL приложения из переменных окружения или аргументов командной строки
// Если указан аргумент в командной строке, используем его, иначе используем боевой URL
let appUrl = process.argv[2] || 'https://uni-farm-connect-2-misterxuniverse.replit.app';

// Проверка обязательных параметров
if (!BOT_TOKEN) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения');
  process.exit(1);
}

// Выводим информацию об используемых параметрах
console.log('🔧 Настройка Telegram webhook с использованием следующих параметров:');
console.log(`📡 URL приложения: ${appUrl}`);
console.log(`🔑 Токен бота: ${BOT_TOKEN.substring(0, 10)}...`);

// Проверка валидности URL
try {
  new URL(appUrl);
} catch (e) {
  console.error('❌ Ошибка: Указан невалидный URL приложения');
  console.log('Использование: node setup-webhook.mjs <URL приложения>');
  console.log('Пример: node setup-webhook.mjs https://your-app.replit.app');
  process.exit(1);
}

// Удаляем слеш в конце URL, если он есть
if (appUrl.endsWith('/')) {
  appUrl = appUrl.slice(0, -1);
}

const webhookUrl = `${appUrl}/api/telegram/webhook`;

// Функция для отправки запроса в Telegram API
async function callTelegramApi(method, data = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`❌ Ошибка при вызове ${method}:`, error.message);
    return null;
  }
}

// Функция для получения информации о текущем webhook
async function getWebhookInfo() {
  try {
    const result = await callTelegramApi('getWebhookInfo');
    
    if (!result || !result.ok) {
      console.error('❌ Не удалось получить информацию о webhook:', result?.description || 'Неизвестная ошибка');
      if (result?.error_code) {
        console.error(`   Код ошибки: ${result.error_code}`);
      }
      return null;
    }
    
    // Расширенная информация о webhook
    const webhookData = result.result;
    
    // Проверяем и выводим расширенную информацию, если она доступна
    if (webhookData) {
      const ipAddress = webhookData.ip_address ? webhookData.ip_address : 'Не определен';
      const lastErrorDate = webhookData.last_error_date 
        ? new Date(webhookData.last_error_date * 1000).toISOString() 
        : 'Нет ошибок';
      const lastErrorMessage = webhookData.last_error_message || 'Нет ошибок';
      
      // Дополнительное логирование для диагностики
      if (webhookData.last_error_date) {
        console.log('⚠️ Последняя ошибка webhook:');
        console.log(`   Дата: ${lastErrorDate}`);
        console.log(`   Сообщение: ${lastErrorMessage}`);
      }
      
      if (webhookData.url) {
        console.log(`   IP адрес сервера: ${ipAddress}`);
        console.log(`   Максимальное число соединений: ${webhookData.max_connections || 'по умолчанию'}`);
        console.log(`   Разрешенные обновления: ${webhookData.allowed_updates?.join(', ') || 'все типы'}`);
      }
    }
    
    return webhookData;
  } catch (error) {
    console.error('❌ Критическая ошибка при получении информации о webhook:', error);
    return null;
  }
}

// Функция для установки webhook
async function setWebhook() {
  console.log(`🔄 Настройка webhook для URL: ${webhookUrl}`);
  
  // Расширенная конфигурация webhook
  const webhookConfig = {
    url: webhookUrl,
    drop_pending_updates: true,
    allowed_updates: ['message', 'edited_message', 'callback_query', 'inline_query'],
    max_connections: 40 // Оптимальное значение для большинства ботов
  };
  
  console.log('🛠️ Конфигурация webhook:', JSON.stringify(webhookConfig, null, 2));
  
  try {
    const result = await callTelegramApi('setWebhook', webhookConfig);
    
    if (!result || !result.ok) {
      console.error('❌ Не удалось установить webhook:', result?.description || 'Неизвестная ошибка');
      if (result?.error_code) {
        console.error(`   Код ошибки: ${result.error_code}`);
      }
      return false;
    }
    
    console.log('✅ Webhook успешно установлен!');
    return true;
  } catch (error) {
    console.error('❌ Критическая ошибка при установке webhook:', error);
    return false;
  }
}

// Основная функция
async function main() {
  console.log('🤖 Начало настройки Telegram webhook...');
  console.log('⏱️ Время запуска:', new Date().toISOString());
  
  try {
    // Получаем текущую информацию о webhook
    console.log('🔍 Получение текущей информации о webhook...');
    const webhookInfo = await getWebhookInfo();
    
    // Обработка текущего состояния webhook
    if (webhookInfo) {
      console.log('ℹ️ Текущий webhook:');
      console.log(`   URL: ${webhookInfo.url || 'Не установлен'}`);
      console.log(`   Ожидающие обновления: ${webhookInfo.pending_update_count}`);
      
      // Проверка, установлен ли webhook уже на нужный URL
      if (webhookInfo.url === webhookUrl) {
        console.log('✅ Webhook уже настроен на правильный URL');
        
        // Дополнительная проверка - пингуем бота для проверки токена
        try {
          const botInfo = await callTelegramApi('getMe');
          if (botInfo && botInfo.ok) {
            console.log('✅ Токен бота действителен. Информация о боте:');
            console.log(`   Имя: ${botInfo.result.first_name}`);
            console.log(`   Username: @${botInfo.result.username}`);
            console.log(`   ID: ${botInfo.result.id}`);
          } else {
            console.error('❌ Не удалось получить информацию о боте. Токен может быть недействительным.');
          }
        } catch (e) {
          console.error('❌ Ошибка при проверке токена бота:', e);
        }
        
        return;
      }
      
      // Если webhook настроен на другой URL, сообщаем пользователю
      if (webhookInfo.url) {
        console.log(`⚠️ Текущий webhook настроен на другой URL: ${webhookInfo.url}`);
        console.log('🔄 Перенастраиваем webhook на новый URL...');
      }
    } else {
      console.log('ℹ️ Текущий webhook не настроен или не удалось получить информацию');
    }
    
    // Устанавливаем новый webhook
    const webhookResult = await setWebhook();
    
    if (!webhookResult) {
      console.error('❌ Не удалось установить webhook. Прерываем выполнение.');
      return;
    }
    
    // Проверяем успешность установки
    console.log('🔍 Проверка успешности установки webhook...');
    const newWebhookInfo = await getWebhookInfo();
    
    if (newWebhookInfo && newWebhookInfo.url === webhookUrl) {
      console.log('🎉 Webhook успешно настроен и проверен!');
      console.log(`🌐 WebApp теперь получает обновления с Telegram на: ${webhookUrl}`);
      
      // Проверяем информацию о боте для подтверждения правильности токена
      try {
        const botInfo = await callTelegramApi('getMe');
        if (botInfo && botInfo.ok) {
          console.log('✅ Токен бота действителен. Информация о боте:');
          console.log(`   Имя: ${botInfo.result.first_name}`);
          console.log(`   Username: @${botInfo.result.username}`);
          console.log(`   ID: ${botInfo.result.id}`);
        } else {
          console.warn('⚠️ Webhook настроен, но не удалось получить информацию о боте.');
        }
      } catch (e) {
        console.warn('⚠️ Webhook настроен, но возникла ошибка при проверке токена бота:', e);
      }
    } else {
      console.error('❌ Что-то пошло не так при проверке webhook.');
      console.error('   Ожидаемый URL:', webhookUrl);
      console.error('   Фактический URL:', newWebhookInfo?.url || 'не установлен');
    }
  } catch (error) {
    console.error('❌ Произошла непредвиденная ошибка при настройке webhook:', error);
  } finally {
    console.log('⏱️ Время завершения:', new Date().toISOString());
  }
}

// Запускаем основную функцию
main().catch(error => {
  console.error('❌ Непредвиденная ошибка:', error);
  process.exit(1);
});