/**
 * Скрипт для проверки подключения к базе данных в деплое
 * 
 * Отправляет запрос на специальный эндпоинт /api/admin/db-status
 * для проверки статуса подключения к базе данных в уже запущенном приложении
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

// Получите URL приложения из командной строки или используйте URL по умолчанию
const appUrl = process.argv[2] || 'https://uni-farm-connect-2-osadchukdmitro2.replit.app';
const dbStatusEndpoint = `${appUrl}/api/admin/db-status`;
const healthEndpoint = `${appUrl}/health`;

console.log('===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БД В ДЕПЛОЕ =====');
console.log(`URL приложения: ${appUrl}`);

// Проверка эндпоинта /health
async function checkHealth() {
  console.log(`\nПроверка статуса приложения (${healthEndpoint})...`);
  
  try {
    const response = await fetch(healthEndpoint);
    const status = response.status;
    
    if (status === 200) {
      console.log('✅ Приложение запущено и отвечает (статус 200 OK)');
      
      try {
        const text = await response.text();
        console.log('Ответ:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      } catch (error) {
        console.log('Не удалось получить текст ответа');
      }
    } else {
      console.error(`❌ Ошибка: приложение не отвечает корректно (статус ${status})`);
    }
  } catch (error) {
    console.error('❌ Не удалось подключиться к эндпоинту /health:', error.message);
  }
}

// Проверка статуса подключения к БД через API
async function checkDbStatus() {
  console.log(`\nПроверка статуса БД через API (${dbStatusEndpoint})...`);
  
  try {
    const response = await fetch(dbStatusEndpoint);
    const status = response.status;
    
    if (status === 200) {
      const data = await response.json();
      console.log('✅ Успешный ответ от API:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.databaseProvider === 'neon') {
        console.log('✅ Используется Neon DB, как и требовалось');
      } else {
        console.error(`❌ Используется ${data.databaseProvider} вместо Neon DB!`);
      }
      
      if (data.isConnected) {
        console.log('✅ Соединение с БД установлено');
      } else {
        console.error('❌ Соединение с БД НЕ установлено');
      }
      
      if (data.isPartitioned === true) {
        console.log('✅ Таблица transactions партицирована');
      } else {
        console.log('⚠️ Таблица transactions НЕ партицирована');
      }
    } else {
      console.error(`❌ Ошибка: сервер вернул статус ${status}`);
      
      try {
        const text = await response.text();
        console.log('Ответ сервера:', text);
      } catch (error) {
        console.log('Не удалось получить ответ сервера');
      }
    }
  } catch (error) {
    console.error('❌ Не удалось выполнить запрос:', error.message);
  }
}

// Выполняем проверки
async function runChecks() {
  await checkHealth();
  await checkDbStatus();
  
  console.log('\n===== ПРОВЕРКА ЗАВЕРШЕНА =====');
}

runChecks().catch(error => {
  console.error('Произошла ошибка при проверке:', error);
});