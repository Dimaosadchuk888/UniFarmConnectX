/**
 * Проверка работоспособности основных API эндпоинтов UniFarm
 * 
 * Скрипт отправляет запросы к API для проверки корректности возвращаемых данных
 * 
 * Запуск: node test-api-endpoints.js <user_id>
 * Пример: node test-api-endpoints.js 1
 */

import fetch from 'node-fetch';

// Базовый URL API
const API_BASE_URL = process.env.API_URL || 'https://93cb0060-75d7-4281-ac65-b204cda864a4-00-1j7bpbfst9vfx.pike.replit.dev';

/**
 * Тестирует все основные API эндпоинты
 * @param {number} userId - ID пользователя для тестирования
 */
async function testAllEndpoints(userId) {
  console.log(`Начинаем тестирование API эндпоинтов для пользователя ID=${userId}`);
  console.log('====================================================================');
  
  const endpoints = [
    {
      name: 'Баланс кошелька',
      url: `/api/wallet/balance?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Фарминг информация',
      url: `/api/uni-farming/info?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Активные миссии',
      url: `/api/missions/active?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Бусты',
      url: `/api/boosts?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Транзакции', 
      url: `/api/transactions?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Реферальная система',
      url: `/api/referrals?user_id=${userId}`,
      method: 'GET'
    },
    {
      name: 'Статус ежедневного бонуса',
      url: `/api/daily-bonus/status?user_id=${userId}`,
      method: 'GET'
    }
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nТестирование: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint.url}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const responseBody = await response.text();
      
      // Проверяем, является ли ответ валидным JSON
      try {
        const jsonResponse = JSON.parse(responseBody);
        
        console.log(`Статус: ${response.status} ${response.statusText}`);
        console.log(`Формат ответа: ${jsonResponse.success ? 'JSON (success)' : 'JSON (error)'}`);
        
        if (response.ok && jsonResponse.success) {
          console.log('✅ УСПЕШНО');
          successCount++;
        } else {
          console.log(`❌ ОШИБКА: ${jsonResponse.error?.message || 'Неизвестная ошибка'}`);
          failureCount++;
        }
      } catch (parseError) {
        console.log(`Статус: ${response.status} ${response.statusText}`);
        console.log('❌ ОШИБКА: Невалидный JSON в ответе');
        console.log(`Ответ: ${responseBody.substring(0, 100)}...`);
        failureCount++;
      }
    } catch (error) {
      console.log(`❌ ОШИБКА сетевого запроса: ${error.message}`);
      failureCount++;
    }
  }
  
  // Выводим итоговый результат
  console.log('\n====================================================================');
  console.log(`ИТОГИ ТЕСТИРОВАНИЯ:`);
  console.log(`Всего проверено эндпоинтов: ${endpoints.length}`);
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ С ошибками: ${failureCount}`);
  console.log('====================================================================');
}

/**
 * Точка входа в скрипт
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Проверяем наличие необходимых аргументов
    if (args.length < 1) {
      console.error('Необходимо указать ID пользователя');
      console.error('Использование: node test-api-endpoints.js <user_id>');
      process.exit(1);
    }
    
    // Парсим и валидируем ID пользователя
    const userId = parseInt(args[0]);
    
    if (isNaN(userId) || userId <= 0) {
      console.error('ID пользователя должен быть положительным числом');
      process.exit(1);
    }
    
    // Запускаем тестирование
    await testAllEndpoints(userId);
    
  } catch (error) {
    console.error('Неожиданная ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();